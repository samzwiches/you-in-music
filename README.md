# You In Music

You In Music is now organized around one customer path instead of overlapping prototype routes.

## Customer flow

1. `index.html` — canonical homepage
2. `you-in-music-journey.html` — lightweight pre-purchase thread: feeling, center of gravity, one optional detail, sound
3. `you-in-music-options.html` — Quick Spark, Deep Dive, or Signature Piece
4. `you-in-music-checkout.html` — customer details and Stripe Checkout handoff
5. `you-in-music-story-room.html?session_id=...` — paid, tier-aware private Story Room
6. `you-in-music-admin.html` — private Creator Room for paid orders

Supporting public pages:

- `you-in-music-process.html` — trust, privacy, and how the process works
- `you-in-music-gift.html` — alternate gift-focused entrance into the same Journey

Held for later:

- `you-in-music-community.html` — preserved but removed from public navigation and marked noindex until real permissioned community content exists

Compatibility/internal routes:

- `you-in-music-home.html` redirects to `index.html`
- `you-in-music-intake.html` preserves old Stripe success links by forwarding the session to the unified Story Room
- `docs/design-board.html` archives the original launch/design board

## Business layer

`src/index.js` handles:

- Stripe Checkout session creation
- Stripe webhook verification
- D1 order storage
- paid order lookup
- Story Room submission
- Creator Room order/status APIs

The full Story Room payload is stored in `story_json`. Legacy summary fields are still populated so the Creator Room can build a fast creation brief.

## Local development

Install dependencies:

```bash
npm install
```

Create/populate a fresh local D1 database:

```bash
npm run db:setup:local
```

If you already have the older local orders database, apply the Story Room migration instead:

```bash
npm run db:migrate:story-room:local
```

Copy `.dev.vars.example` to `.dev.vars` and add Stripe test values and an admin token.

Run the full local app:

```bash
npm run dev
```

The default local command uses `wrangler.local.jsonc`, so both static pages and `/api/*` routes run together.

To inspect the Story Room design without completing checkout, use:

```text
/you-in-music-story-room.html?preview=1
```

Preview mode saves locally but cannot submit an order.

## Production Cloudflare binding

The existing `wrangler.jsonc` remains the safe static production config for now.

Before enabling the Worker API in production, create or identify the production D1 database and get its real Cloudflare `database_id`. Cloudflare requires that ID for a production D1 binding. Do not substitute the local placeholder ID from `wrangler.local.jsonc`.

At that point, production `wrangler.jsonc` should add:

- `main: "./src/index.js"`
- an `ASSETS` binding with `run_worker_first: ["/api/*"]`
- the production D1 `DB` binding with its real database ID

Then apply `schema.sql` to a fresh production DB, or `migrations/0002_story_room.sql` to an existing orders DB, before switching live checkout traffic to the Worker.
