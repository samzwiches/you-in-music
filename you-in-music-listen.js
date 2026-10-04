(() => {
  const songs = [
    ['before', 'Before I Knew You', 'before I knew you.mp3', '#ffd36e'],
    ['idea', 'Probably a Terrible Idea (Remix)', 'probably a terrible idea (Remix).m4a', '#ff829e'],
    ['moments', 'These Are the Moments', 'these are the moments.m4a', '#77c8fa'],
    ['boys', 'My Boys Are Coming Home', 'my boys are coming home.m4a', '#a7df85'],
    ['harmony', 'Here Me (Harmony Mix)', 'Here Me (Harmony Mix).m4a', '#64d7c4'],
    ['remix', 'Here Me (Remastered) (Remix)', 'here me (Remastered) (Remix).m4a', '#ffaf79']
  ];

  let selected = window.YIM?.getSound?.() || '';
  if (!songs.some(song => song[0] === selected)) selected = '';

  const songById = id => songs.find(song => song[0] === id);
  const formatTime = value => {
    if (!Number.isFinite(value)) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  document.querySelectorAll('[data-listening-room]').forEach(room => {
    const inJourney = document.body.classList.contains('v3-journey') || location.pathname.includes('journey');
    renderRoom(room, inJourney);
  });

  function renderRoom(room, inJourney, forceBrowse = false) {
    const current = songById(selected);
    const compact = inJourney && current && !forceBrowse;

    if (compact) {
      room.innerHTML = `
        <div class="selected-sound-card" style="--style-color:${current[3]}">
          <div>
            <small>YOUR SOUND SO FAR</small>
            <h3>${current[1]}</h3>
            <p>You already chose this direction. Keep it, listen again, or reopen the shelf.</p>
          </div>
          <audio preload="metadata" src="./you-in-music-audio/${encodeURIComponent(current[2])}"></audio>
          <div class="selected-sound-actions">
            <button type="button" data-play-current>▶ Play this sample</button>
            <button type="button" data-change-sound>Change the sound</button>
            <a class="primary-button" href="./you-in-music-options.html">Keep it and choose my song →</a>
          </div>
        </div>`;

      const audio = room.querySelector('audio');
      const play = room.querySelector('[data-play-current]');
      play.addEventListener('click', async () => {
        if (audio.paused) {
          try { await audio.play(); } catch {}
        } else {
          audio.pause();
        }
      });
      audio.addEventListener('play', () => { play.textContent = 'Ⅱ Pause sample'; });
      audio.addEventListener('pause', () => { play.textContent = '▶ Play this sample'; });
      room.querySelector('[data-change-sound]').addEventListener('click', () => renderRoom(room, inJourney, true));
      return;
    }

    room.innerHTML = `
      <ol class="song-progress" aria-label="Song creation progress">
        <li class="${inJourney ? 'done' : 'active'}">Find your sound</li>
        <li class="${inJourney ? 'active' : ''}">Choose your path</li>
        <li>Tell the full story</li>
      </ol>
      <div class="section-head">
        <div class="kicker">Made with You In Music</div>
        <h2>Different stories. Different sounds.</h2>
        <p>Do not name the genre. Notice which one makes you lean closer.</p>
      </div>
      <div class="listening-grid">
        ${songs.map(([id, title, file, color], index) => `
          <article class="listening-style" style="--style-color:${color}" data-song-card="${id}">
            <div class="sample-topline">
              <span>SAMPLE ${String(index + 1).padStart(2, '0')}</span>
              <span class="sample-selected-mark" aria-hidden="true">YOUR SOUND</span>
            </div>
            <h3>${title}</h3>
            <p class="sample-instruction">Listen for the emotional shape, not the label.</p>
            <audio preload="metadata" aria-label="Listen to ${title}" src="./you-in-music-audio/${encodeURIComponent(file)}"></audio>
            <div class="sample-player">
              <button type="button" class="sample-play" aria-label="Play ${title}">
                <span aria-hidden="true">▶</span>
                <strong>Play sample</strong>
              </button>
              <div class="sample-track" aria-hidden="true"><i></i></div>
              <span class="sample-time">0:00</span>
            </div>
            <button type="button" class="sample-select" data-select="${id}">This feels like mine</button>
            <p class="sample-error" role="status"></p>
          </article>
        `).join('')}
      </div>
      <div class="listening-footer">
        <div>
          <small>YOUR CURRENT DIRECTION</small>
          <p role="status" data-listening-status></p>
        </div>
        <a class="primary-button" href="${inJourney ? './you-in-music-options.html' : './you-in-music-journey.html#listen'}">
          ${inJourney ? 'Keep this sound and choose my song →' : 'Continue with this sound →'}
        </a>
      </div>`;

    wirePlayers(room);

    room.addEventListener('click', event => {
      const button = event.target.closest('[data-select]');
      if (!button || !room.contains(button)) return;
      selected = button.dataset.select;
      const song = songById(selected);
      window.YIM?.setSound?.(selected, song?.[1] || '');
      renderSelectionState();
      if (inJourney) {
        setTimeout(() => renderRoom(room, inJourney), 180);
      }
    }, { once: false });

    renderSelectionState();
  }

  function wirePlayers(room) {
    room.querySelectorAll('[data-song-card]').forEach(card => {
      const audio = card.querySelector('audio');
      const play = card.querySelector('.sample-play');
      const playIcon = play.querySelector('span');
      const playLabel = play.querySelector('strong');
      const progress = card.querySelector('.sample-track i');
      const time = card.querySelector('.sample-time');

      play.addEventListener('click', async () => {
        if (audio.paused) {
          document.querySelectorAll('[data-song-card] audio').forEach(other => {
            if (other !== audio) other.pause();
          });
          try { await audio.play(); } catch {}
        } else {
          audio.pause();
        }
      });

      audio.addEventListener('play', () => {
        play.classList.add('playing');
        playIcon.textContent = 'Ⅱ';
        playLabel.textContent = 'Pause';
      });

      audio.addEventListener('pause', () => {
        play.classList.remove('playing');
        playIcon.textContent = '▶';
        playLabel.textContent = 'Play sample';
      });

      audio.addEventListener('timeupdate', () => {
        const ratio = audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0;
        progress.style.width = `${ratio * 100}%`;
        time.textContent = formatTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        progress.style.width = '0%';
        time.textContent = '0:00';
      });

      audio.addEventListener('error', () => {
        card.querySelector('.sample-error').textContent = 'This song could not load. Please try again shortly.';
      });
    });
  }

  function renderSelectionState() {
    const current = songById(selected);

    document.querySelectorAll('[data-select]').forEach(button => {
      const active = button.dataset.select === selected;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? 'Selected direction' : 'This feels like mine';
      button.closest('article')?.classList.toggle('selected', active);
    });

    document.querySelectorAll('[data-listening-status]').forEach(status => {
      status.textContent = current
        ? `${current[1]} selected`
        : 'Nothing selected yet. Play a few and notice what pulls you closer.';
    });
  }

  window.addEventListener('pagehide', () => {
    document.querySelectorAll('audio').forEach(player => player.pause());
  });
})();