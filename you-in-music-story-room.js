(() => {
  const yim = window.YIM;
  if (!yim) return;

  const tierNames = {
    quick: 'Quick Spark',
    deep: 'Deep Dive',
    signature: 'Signature Piece'
  };

  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const previewMode = params.get('preview') === '1' || ['localhost', '127.0.0.1'].includes(location.hostname);

  let summary = yim.summary?.() || {};
  let tier = ['quick', 'deep', 'signature'].includes(summary.selected_tier)
    ? summary.selected_tier
    : 'deep';
  let story = { ...(yim.getStory?.() || {}) };
  let order = null;
  let canSubmit = false;
  let lockedForProduction = false;
  let saveTimer;

  const saveStatus = document.querySelector('[data-save-status]');
  const submitStatus = document.querySelector('[data-submit-status]');
  const submitButton = document.querySelector('[data-submit-story]');

  function allowedForTier(value) {
    const allowed = String(value || '').trim().split(/\s+/).filter(Boolean);
    return allowed.length === 0 || allowed.includes(tier);
  }

  function configureTier() {
    const tierName = document.querySelector('[data-tier-name]');
    if (tierName) tierName.textContent = tierNames[tier] || tierNames.deep;

    document.querySelectorAll('[data-tier-section]').forEach(section => {
      section.hidden = !allowedForTier(section.dataset.tierSection);
    });

    document.querySelectorAll('[data-tier-link]').forEach(link => {
      link.hidden = !allowedForTier(link.dataset.tierLink);
    });
  }

  function restoreThread() {
    const soundTitle = summary.sound_title
      || yim.soundTitles?.[summary.sound_style]
      || 'Still listening';

    document.querySelector('[data-thread-feeling]').textContent = summary.feeling || 'Still deciding';
    document.querySelector('[data-thread-center]').textContent = summary.story_center || 'Still deciding';
    document.querySelector('[data-thread-sound]').textContent = soundTitle;
    document.querySelector('[data-carried-detail]').textContent = summary.tiny_detail || 'Nothing yet';
  }

  function restoreStory() {
    document.querySelectorAll('[data-story]').forEach(field => {
      const key = field.dataset.story;
      if (Object.prototype.hasOwnProperty.call(story, key)) {
        field.value = story[key] ?? '';
      }
    });
  }

  function gatherStory() {
    const patch = {};
    document.querySelectorAll('[data-story]').forEach(field => {
      patch[field.dataset.story] = field.value;
    });
    return patch;
  }

  function scheduleSave() {
    if (lockedForProduction) return;
    if (saveStatus) saveStatus.textContent = previewMode && !sessionId
      ? 'Preview mode · saving locally'
      : 'Saving on this device…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAll, 350);
  }

  function saveAll() {
    const patch = gatherStory();
    story = { ...story, ...patch };
    yim.writeStory?.(patch);

    if (saveStatus) {
      saveStatus.textContent = previewMode && !sessionId
        ? 'Preview mode · saved on this device'
        : 'Saved on this device';
    }

    updateProgress();
    renderRecap();
  }

  function visibleProgressFields() {
    return [...document.querySelectorAll('[data-progress-field]')].filter(field => {
      const tierSection = field.closest('[data-tier-section]');
      return !tierSection || !tierSection.hidden;
    });
  }

  function updateProgress() {
    const fields = visibleProgressFields();
    const filled = fields.filter(field => field.value.trim().length > 0).length;
    const percent = fields.length ? Math.round((filled / fields.length) * 100) : 0;

    const bar = document.querySelector('[data-progress-bar]');
    const number = document.querySelector('[data-progress-number]');
    if (bar) bar.style.width = percent + '%';
    if (number) number.textContent = percent + '%';

    const title = document.querySelector('[data-finish-title]');
    const copy = document.querySelector('[data-finish-copy]');
    if (!title || !copy) return;

    if (lockedForProduction) {
      title.textContent = 'This story is already in production.';
      copy.textContent = 'You can read what you sent, but changes are locked once creation has started.';
    } else if (percent >= 100) {
      title.textContent = 'The whole room is lit up.';
      copy.textContent = 'You can still edit anything. Complete does not mean frozen.';
    } else if (percent >= 70) {
      title.textContent = 'This is enough to start hearing the song.';
      copy.textContent = 'There is already a center, a scene, and a truth here. Anything else you add gives the song more fingerprints.';
    } else if (percent >= 35) {
      title.textContent = 'The shape is showing up.';
      copy.textContent = 'You do not need to fill every box. Follow the questions that keep tugging at you.';
    } else {
      title.textContent = 'You have started pulling the thread.';
      copy.textContent = 'Start with the question that feels easiest. The story does not have to arrive in order.';
    }
  }

  function excerpt(value, max = 150) {
    const clean = String(value || '').trim().replace(/\s+/g, ' ');
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1).trimEnd() + '…';
  }

  function renderRecap() {
    const current = { ...story, ...gatherStory() };
    const recap = document.querySelector('[data-live-recap]');
    if (!recap) return;

    const candidates = [
      ['THE PERSON', current.first_notice],
      ['THE SCENE', current.core_scene],
      ['THE IMAGE', current.scene_image],
      ['THE UNSAID THING', current.unsaid_truth],
      ['THE COMPLICATION', current.contradiction],
      ['THE TRUTH AT THE END', current.final_truth],
      ['THE SOUND OF IT', current.sounds],
      ['THE MUST KEEP', current.must_keep]
    ].filter(([, value]) => String(value || '').trim());

    recap.replaceChildren();

    if (!candidates.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Your answers will gather here as you tell the story.';
      recap.append(empty);
      return;
    }

    candidates.slice(0, 4).forEach(([label, value]) => {
      const item = document.createElement('article');
      const small = document.createElement('small');
      const p = document.createElement('p');
      small.textContent = label;
      p.textContent = excerpt(value);
      item.append(small, p);
      recap.append(item);
    });
  }

  function wireFields() {
    document.querySelectorAll('[data-story]').forEach(field => {
      field.addEventListener('input', () => {
        scheduleSave();
        updateProgress();
        renderRecap();
      });
      field.addEventListener('change', scheduleSave);
    });
  }

  function wireSectionNav() {
    const links = [...document.querySelectorAll('.story-room-nav a[href^="#"]')].filter(link => !link.hidden);
    const sections = links
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!('IntersectionObserver' in window) || !sections.length) return;

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      links.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + visible.target.id);
      });
    }, {
      rootMargin: '-18% 0px -65% 0px',
      threshold: [0, 0.2, 0.5]
    });

    sections.forEach(section => observer.observe(section));
  }

  function lockFields(message) {
    lockedForProduction = true;
    document.querySelectorAll('[data-story]').forEach(field => {
      field.disabled = true;
    });
    if (submitButton) submitButton.disabled = true;
    if (submitStatus && message) submitStatus.textContent = message;
  }

  function statusLabel(value) {
    return ({
      paid: 'Payment confirmed',
      ready_to_create: 'Story received',
      in_progress: 'Song in progress',
      preview_sent: 'Preview sent',
      complete: 'Complete'
    })[value] || value || 'Order found';
  }

  async function loadOrder() {
    if (!sessionId) {
      if (previewMode) {
        if (saveStatus) saveStatus.textContent = 'Preview mode · saved only on this device';
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Preview mode · checkout required to submit';
        }
        return;
      }

      if (saveStatus) saveStatus.textContent = 'Secure checkout required';
      lockFields('Open the Story Room from your paid checkout link.');
      return;
    }

    if (saveStatus) saveStatus.textContent = 'Confirming payment…';

    try {
      const response = await fetch('/api/order?session_id=' + encodeURIComponent(sessionId));
      const data = await response.json();

      if (!response.ok || !data.order) {
        throw new Error(data.error || 'Could not open this order.');
      }

      order = data.order;
      const allowedStatuses = new Set(['paid', 'ready_to_create', 'in_progress', 'preview_sent', 'complete']);

      if (!allowedStatuses.has(order.status)) {
        if (saveStatus) saveStatus.textContent = 'Payment is still being confirmed';
        lockFields('Payment has not been confirmed yet. Refresh this page in a moment.');
        return;
      }

      if (['quick', 'deep', 'signature'].includes(order.tier)) tier = order.tier;

      summary = {
        ...summary,
        selected_tier: tier,
        feeling: order.feeling || summary.feeling || '',
        story_center: order.story_center || summary.story_center || '',
        sound_style: order.sound_style || summary.sound_style || '',
        sound_title: yim.soundTitles?.[order.sound_style] || summary.sound_title || '',
        phrase: order.phrase || summary.phrase || '',
        place: order.place || summary.place || '',
        tiny_detail: order.tiny_detail || summary.tiny_detail || '',
        ending_feeling: order.ending_feeling || summary.ending_feeling || ''
      };

      if (order.story && typeof order.story === 'object') {
        story = { ...story, ...order.story };
        yim.writeStory?.(order.story);
      }

      yim.write?.({
        selected_tier: tier,
        feeling: summary.feeling,
        story_center: summary.story_center,
        tiny_detail: summary.tiny_detail
      });

      if (order.sound_style) {
        yim.setSound?.(order.sound_style, summary.sound_title);
      }

      canSubmit = ['paid', 'ready_to_create'].includes(order.status);

      if (saveStatus) {
        saveStatus.textContent = statusLabel(order.status);
      }

      if (!canSubmit) {
        lockFields('This story is already in production, so changes are locked here.');
      }
    } catch (error) {
      if (saveStatus) saveStatus.textContent = 'Could not open Story Room';
      lockFields(error.message || 'Could not open this order.');
    }
  }

  function wireSubmit() {
    if (!submitButton) return;

    if (!sessionId || previewMode && !sessionId || !canSubmit) {
      if (!lockedForProduction && !sessionId) submitButton.disabled = true;
      return;
    }

    submitButton.addEventListener('click', async () => {
      clearTimeout(saveTimer);
      saveAll();

      submitButton.disabled = true;
      if (submitStatus) {
        submitStatus.className = 'story-submit-status';
        submitStatus.textContent = 'Sending your story securely…';
      }

      try {
        const response = await fetch('/api/intake', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            story: gatherStory()
          })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Could not send your story.');
        }

        if (submitStatus) {
          submitStatus.className = 'story-submit-status success';
          submitStatus.textContent = 'Got it. Your story is in the creation queue.';
        }
        submitButton.textContent = 'Story received';
        if (saveStatus) saveStatus.textContent = 'Story received · ready to create';
      } catch (error) {
        if (submitStatus) {
          submitStatus.className = 'story-submit-status error';
          submitStatus.textContent = error.message || 'Could not send your story.';
        }
        submitButton.disabled = false;
      }
    });
  }

  async function init() {
    await loadOrder();
    configureTier();
    restoreThread();
    restoreStory();
    wireFields();
    wireSectionNav();
    updateProgress();
    renderRecap();
    wireSubmit();

    if (!lockedForProduction && !previewMode && sessionId && saveStatus?.textContent === 'Payment confirmed') {
      saveStatus.textContent = 'Payment confirmed · autosaving on this device';
    }

    const state = yim.read?.() || {};
    if (!state.story_room_started) {
      yim.write?.({ story_room_started: true });
    }
  }

  init();
})();