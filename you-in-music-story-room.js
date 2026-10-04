(() => {
  const yim = window.YIM;
  if (!yim) return;

  const tierNames = {
    quick: 'Quick Spark',
    deep: 'Deep Dive',
    signature: 'Signature Piece'
  };

  const summary = yim.summary?.() || {};
  const state = yim.read?.() || {};
  const tier = ['quick', 'deep', 'signature'].includes(summary.selected_tier)
    ? summary.selected_tier
    : 'deep';

  const story = yim.getStory?.() || {};
  const saveStatus = document.querySelector('[data-save-status]');
  let saveTimer;

  function allowedForTier(value) {
    const allowed = String(value || '').trim().split(/\s+/).filter(Boolean);
    return allowed.length === 0 || allowed.includes(tier);
  }

  function configureTier() {
    document.querySelector('[data-tier-name]').textContent = tierNames[tier];

    document.querySelectorAll('[data-tier-section]').forEach(section => {
      section.hidden = !allowedForTier(section.dataset.tierSection);
    });

    document.querySelectorAll('[data-tier-link]').forEach(link => {
      link.hidden = !allowedForTier(link.dataset.tierLink);
    });
  }

  function restoreThread() {
    document.querySelector('[data-thread-feeling]').textContent = summary.feeling || 'Still deciding';
    document.querySelector('[data-thread-center]').textContent = summary.story_center || 'Still deciding';
    document.querySelector('[data-thread-sound]').textContent = summary.sound_title || 'Still listening';

    document.querySelector('[data-carried-phrase]').textContent = summary.phrase || 'Nothing yet';
    document.querySelector('[data-carried-place]').textContent = summary.place || 'Nothing yet';
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
    if (saveStatus) saveStatus.textContent = 'Saving locally...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAll, 350);
  }

  function saveAll() {
    const patch = gatherStory();
    yim.writeStory?.(patch);
    if (saveStatus) saveStatus.textContent = 'Saved on this device';
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

    if (percent >= 100) {
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

    document.querySelector('[data-save-now]')?.addEventListener('click', () => {
      clearTimeout(saveTimer);
      saveAll();
      const button = document.querySelector('[data-save-now]');
      const original = button.textContent;
      button.textContent = 'Saved';
      setTimeout(() => { button.textContent = original; }, 1200);
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

  configureTier();
  restoreThread();
  restoreStory();
  wireFields();
  wireSectionNav();
  updateProgress();
  renderRecap();

  if (!state.story_room_started) {
    yim.write?.({ story_room_started: true });
  }
})();