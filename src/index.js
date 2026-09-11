const TIERS = {
  quick: { name: 'Quick Spark', amount: 4900 },
  deep: { name: 'Deep Dive', amount: 8900 },
  signature: { name: 'Signature Piece', amount: 14900 },
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/checkout' && request.method === 'POST') return createCheckout(request, env, url);
      if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') return stripeWebhook(request, env);
      if (url.pathname === '/api/order' && request.method === 'GET') return getOrder(request, env, url);
      if (url.pathname === '/api/intake' && request.method === 'POST') return saveIntake(request, env);
      if (url.pathname === '/api/admin/orders' && request.method === 'GET') return adminOrders(request, env);
      if (url.pathname === '/api/admin/status' && request.method === 'POST') return adminStatus(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: 'Something went wrong on the server.' }, 500);
    }
  },
};

async function createCheckout(request, env, url) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe is not configured yet.' }, 500);
  const body = await request.json();
  const tierKey = String(body.tier || '').toLowerCase();
  const tier = TIERS[tierKey];
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  if (!tier) return json({ error: 'Choose a valid song experience.' }, 400);
  if (!name || !email || !email.includes('@')) return json({ error: 'Name and a valid email are required.' }, 400);

  const orderId = id();
  const stamp = now();
  await env.DB.prepare(`INSERT INTO orders (
    id,status,customer_name,email,recipient,tier,amount_cents,sound_style,feeling,story_center,phrase,place,tiny_detail,ending_feeling,created_at,updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    orderId, 'draft', name, email, clean(body.recipient), tierKey, tier.amount,
    clean(body.sound_style), clean(body.feeling), clean(body.story_center), clean(body.phrase), clean(body.place),
    clean(body.tiny_detail), clean(body.ending_feeling), stamp, stamp
  ).run();

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${url.origin}/you-in-music-intake.html?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${url.origin}/you-in-music-checkout.html?tier=${encodeURIComponent(tierKey)}&canceled=1`);
  form.set('customer_email', email);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(tier.amount));
  form.set('line_items[0][price_data][product_data][name]', `You In Music · ${tier.name}`);
  form.set('metadata[order_id]', orderId);
  form.set('metadata[tier]', tierKey);

  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const session = await stripe.json();
  if (!stripe.ok) {
    await env.DB.prepare('UPDATE orders SET status=?, updated_at=? WHERE id=?').bind('checkout_error', now(), orderId).run();
    return json({ error: session?.error?.message || 'Stripe could not start checkout.' }, 502);
  }
  await env.DB.prepare('UPDATE orders SET stripe_session_id=?, status=?, updated_at=? WHERE id=?')
    .bind(session.id, 'checkout_created', now(), orderId).run();
  return json({ url: session.url });
}

async function stripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('Webhook secret missing', { status: 500 });
  const raw = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  const valid = await verifyStripeSignature(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return new Response('Invalid signature', { status: 400 });
  const event = JSON.parse(raw);
  const session = event.data?.object;
  if (!session?.id) return new Response('ok');

  if (event.type === 'checkout.session.completed') {
    if (session.payment_status === 'paid') await markPaid(env, session);
    else await setSessionStatus(env, session.id, 'payment_processing');
  }
  if (event.type === 'checkout.session.async_payment_succeeded') await markPaid(env, session);
  if (event.type === 'checkout.session.async_payment_failed') await setSessionStatus(env, session.id, 'payment_failed');
  return new Response('ok');
}

async function markPaid(env, session) {
  const orderId = session.metadata?.order_id;
  const stamp = now();
  if (orderId) {
    await env.DB.prepare(`UPDATE orders SET stripe_payment_intent_id=?, status='paid', paid_at=COALESCE(paid_at,?), updated_at=? WHERE id=?`)
      .bind(session.payment_intent || null, stamp, stamp, orderId).run();
  } else {
    await env.DB.prepare(`UPDATE orders SET stripe_payment_intent_id=?, status='paid', paid_at=COALESCE(paid_at,?), updated_at=? WHERE stripe_session_id=?`)
      .bind(session.payment_intent || null, stamp, stamp, session.id).run();
  }
}

async function setSessionStatus(env, sessionId, status) {
  await env.DB.prepare('UPDATE orders SET status=?, updated_at=? WHERE stripe_session_id=?').bind(status, now(), sessionId).run();
}

async function getOrder(request, env, url) {
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) return json({ error: 'Missing session.' }, 400);
  let order = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id=?').bind(sessionId).first();
  if (!order) return json({ error: 'Order not found.' }, 404);

  if (!['paid','ready_to_create','in_progress','preview_sent','complete'].includes(order.status) && env.STRIPE_SECRET_KEY) {
    const stripe = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    if (stripe.ok) {
      const session = await stripe.json();
      if (session.payment_status === 'paid') {
        await markPaid(env, session);
        order = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id=?').bind(sessionId).first();
      }
    }
  }
  return json({ order: publicOrder(order) });
}

async function saveIntake(request, env) {
  const body = await request.json();
  const sessionId = String(body.session_id || '');
  const order = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id=?').bind(sessionId).first();
  if (!order) return json({ error: 'Order not found.' }, 404);
  if (!['paid','ready_to_create'].includes(order.status)) return json({ error: 'Payment must be confirmed before the story room opens.' }, 403);

  const stamp = now();
  await env.DB.prepare(`UPDATE orders SET
    song_for_name=?, relationship=?, pronunciation=?, occasion_date=?, core_story=?, memories=?, must_include=?, must_avoid=?,
    genre_notes=?, vocalist_pref=?, energy_notes=?, language_notes=?, private_notes=?, status='ready_to_create',
    intake_submitted_at=?, updated_at=? WHERE stripe_session_id=?`).bind(
      clean(body.song_for_name), clean(body.relationship), clean(body.pronunciation), clean(body.occasion_date), clean(body.core_story),
      clean(body.memories), clean(body.must_include), clean(body.must_avoid), clean(body.genre_notes), clean(body.vocalist_pref),
      clean(body.energy_notes), clean(body.language_notes), clean(body.private_notes), stamp, stamp, sessionId
    ).run();
  return json({ ok: true });
}

async function adminOrders(request, env) {
  if (!adminOk(request, env)) return json({ error: 'Unauthorized.' }, 401);
  const { results } = await env.DB.prepare(`SELECT * FROM orders WHERE status IN ('paid','ready_to_create','in_progress','preview_sent','complete') ORDER BY created_at DESC LIMIT 100`).all();
  return json({ orders: results });
}

async function adminStatus(request, env) {
  if (!adminOk(request, env)) return json({ error: 'Unauthorized.' }, 401);
  const body = await request.json();
  const allowed = new Set(['paid','ready_to_create','in_progress','preview_sent','complete']);
  if (!allowed.has(body.status)) return json({ error: 'Invalid status.' }, 400);
  await env.DB.prepare('UPDATE orders SET status=?, updated_at=? WHERE id=?').bind(body.status, now(), String(body.id || '')).run();
  return json({ ok: true });
}

function adminOk(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  return request.headers.get('authorization') === `Bearer ${env.ADMIN_TOKEN}`;
}

function publicOrder(order) {
  return {
    status: order.status, customer_name: order.customer_name, email: order.email, recipient: order.recipient,
    tier: order.tier, amount_cents: order.amount_cents, sound_style: order.sound_style, feeling: order.feeling,
    story_center: order.story_center, phrase: order.phrase, place: order.place, tiny_detail: order.tiny_detail,
    ending_feeling: order.ending_feeling,
  };
}

function clean(value) {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, 12000) : null;
}

async function verifyStripeSignature(payload, header, secret) {
  const parts = header.split(',').map(x => x.trim());
  const timestamp = parts.find(x => x.startsWith('t='))?.slice(2);
  const signatures = parts.filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const data = new TextEncoder().encode(`${timestamp}.${payload}`);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, data);
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return signatures.some(sig => safeEqual(sig, expected));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
