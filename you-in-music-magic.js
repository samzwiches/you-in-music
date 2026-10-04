(() => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const magicSelector = [
    '.v2-cta',
    '.v2-pill',
    '.memory-tile',
    '.sample-select',
    '.primary-button',
    '.secondary-button',
    '.ghost-button',
    '.tier-button',
    '.tiny-button',
    '.v3-choice-cloud button',
    '.v3-person-card',
    '.v3-feeling-nav a',
    '.v3-checkout-form button',
    '.v3-final a',
    '.v2-final a'
  ].join(',');

  const layer = document.createElement('div');
  layer.className = 'yim-magic-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  function pointFromEvent(event, target) {
    if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY };
    const box = target.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  function burst(x, y, count = 12) {
    if (reducedMotion) return;

    const ring = document.createElement('span');
    ring.className = 'yim-magic-ring';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), 900);

    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement('i');
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.34;
      const distance = 34 + Math.random() * 78;
      const size = 3 + Math.random() * 5;
      spark.className = 'yim-magic-spark';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--twist', `${Math.round(Math.random() * 220 - 110)}deg`);
      spark.style.setProperty('--delay', `${Math.random() * 75}ms`);
      layer.appendChild(spark);
      setTimeout(() => spark.remove(), 1050);
    }
  }

  function makePortal(anchor, point) {
    if (reducedMotion) return false;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return false;

    let url;
    try { url = new URL(anchor.href, location.href); } catch { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;

    const portal = document.createElement('div');
    portal.className = 'yim-page-portal';
    portal.setAttribute('aria-hidden', 'true');
    portal.style.setProperty('--portal-x', `${point.x}px`);
    portal.style.setProperty('--portal-y', `${point.y}px`);
    document.body.appendChild(portal);

    requestAnimationFrame(() => portal.classList.add('is-open'));
    setTimeout(() => { location.href = url.href; }, 420);
    return true;
  }

  function awakenRecord(record, point) {
    if (reducedMotion) return;
    record.classList.remove('yim-record-awake');
    void record.offsetWidth;
    record.classList.add('yim-record-awake');
    burst(point.x, point.y, 18);

    const symbols = ['✦', '♪', '∿', '✧', '•'];
    symbols.forEach((symbol, index) => {
      const note = document.createElement('span');
      note.className = 'yim-vinyl-note';
      note.textContent = symbol;
      const noteAngle = index * 72 + Math.random() * 24;
      note.style.setProperty('--note-angle', `${noteAngle}deg`);
      note.style.setProperty('--note-angle-neg', `${-noteAngle}deg`);
      note.style.setProperty('--note-delay', `${index * 55}ms`);
      record.appendChild(note);
      setTimeout(() => note.remove(), 1600);
    });
    setTimeout(() => record.classList.remove('yim-record-awake'), 1650);
  }

  function connectConstellation(dot) {
    const orbit = dot.closest('.v2-quote-orbit');
    const center = orbit?.querySelector('.orbit-center');
    if (!orbit || !center || reducedMotion) return;

    const orbitBox = orbit.getBoundingClientRect();
    const dotBox = dot.getBoundingClientRect();
    const centerBox = center.getBoundingClientRect();
    const x1 = dotBox.left + dotBox.width / 2 - orbitBox.left;
    const y1 = dotBox.top + dotBox.height / 2 - orbitBox.top;
    const x2 = centerBox.left + centerBox.width / 2 - orbitBox.left;
    const y2 = centerBox.top + centerBox.height / 2 - orbitBox.top;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const thread = document.createElement('span');
    thread.className = 'yim-constellation-thread';
    thread.style.left = `${x1}px`;
    thread.style.top = `${y1}px`;
    thread.style.width = `${distance}px`;
    thread.style.setProperty('--thread-angle', `${angle}deg`);
    orbit.appendChild(thread);
    requestAnimationFrame(() => thread.classList.add('is-drawn'));

    center.classList.remove('yim-center-pulse');
    void center.offsetWidth;
    center.classList.add('yim-center-pulse');
    setTimeout(() => thread.remove(), 3200);
    setTimeout(() => center.classList.remove('yim-center-pulse'), 1100);
  }

  document.querySelectorAll('.v2-record').forEach(record => {
    record.setAttribute('role', 'button');
    record.setAttribute('tabindex', '0');
    record.setAttribute('aria-label', 'Wake up the record');
  });

  document.querySelectorAll('.quote-dot').forEach(dot => {
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
    dot.setAttribute('aria-label', `Connect ${dot.textContent.trim()} to the constellation`);
  });

  document.addEventListener('click', event => {
    const record = event.target.closest('.v2-record');
    if (record) {
      awakenRecord(record, pointFromEvent(event, record));
      return;
    }

    const dot = event.target.closest('.quote-dot');
    if (dot) {
      const point = pointFromEvent(event, dot);
      burst(point.x, point.y, 9);
      connectConstellation(dot);
      return;
    }

    const target = event.target.closest(magicSelector);
    if (!target) return;
    const point = pointFromEvent(event, target);
    burst(point.x, point.y, target.matches('.memory-tile') ? 16 : 10);

    const anchor = target.closest('a[href]');
    if (!anchor) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.matches('.memory-tile, .v2-cta, .v2-pill, .v3-final a, .v2-final a')) {
      if (makePortal(anchor, point)) event.preventDefault();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const record = target.closest('.v2-record');
    if (record) {
      event.preventDefault();
      awakenRecord(record, pointFromEvent(event, record));
      return;
    }

    const dot = target.closest('.quote-dot');
    if (dot) {
      event.preventDefault();
      const point = pointFromEvent(event, dot);
      burst(point.x, point.y, 9);
      connectConstellation(dot);
    }
  });
})();
