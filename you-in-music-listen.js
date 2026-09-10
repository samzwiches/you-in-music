(() => {
  const songs = [
    ['before', 'Before I Knew You', 'before I knew you.mp3', '#ffd36e'],
    ['idea', 'Probably a Terrible Idea (Remix)', 'probably a terrible idea (Remix).m4a', '#ff829e'],
    ['moments', 'These Are the Moments', 'these are the moments.m4a', '#77c8fa'],
    ['boys', 'My Boys Are Coming Home', 'my boys are coming home.m4a', '#a7df85'],
    ['harmony', 'Here Me (Harmony Mix)', 'Here Me (Harmony Mix).m4a', '#64d7c4'],
    ['remix', 'Here Me (Remastered) (Remix)', 'here me (Remastered) (Remix).m4a', '#ffaf79'],
  ];
  let selected = 'before';
  try { selected = localStorage.getItem('yim-style') || selected; } catch {}
  if (!songs.some(song => song[0] === selected)) selected = 'before';
  document.querySelectorAll('[data-listening-room]').forEach(room => {
    room.innerHTML = `<ol class="song-progress"><li>Find your sound</li><li>Share your story</li><li>Make it yours</li></ol>
      <div class="section-head"><div class="kicker">Made with You In Music</div><h2>Different stories. Different sounds.</h2><p>Find a song that draws you in.</p></div>
      <div class="listening-grid">${songs.map(([id, title, file, color]) => `<article class="listening-style" style="--style-color:${color}"><h3>${title}</h3><audio controls preload="none" aria-label="Listen to ${title}" src="./you-in-music-audio/${encodeURIComponent(file)}"></audio><button type="button" class="sample-select" data-select="${id}">I like this direction</button><p class="sample-error" role="status"></p></article>`).join('')}</div>
      <div class="listening-footer"><p role="status" data-listening-status></p><a class="primary-button" href="./you-in-music-journey.html#listen">Continue with this sound &rarr;</a></div>`;
    if (location.pathname.includes('journey')) {
      room.nextElementSibling.id = 'your-feeling';
      const link = room.querySelector('.listening-footer a');
      link.href = '#your-feeling';
      link.textContent = 'Next: your story';
    }
    room.querySelectorAll('audio').forEach(player => {
      player.addEventListener('play', () => {
        document.querySelectorAll('audio').forEach(other => { if (other !== player) other.pause(); });
      });
      player.addEventListener('error', () => {
        player.parentElement.querySelector('.sample-error').textContent = 'This song could not load. Please try again shortly.';
      });
    });
    room.addEventListener('click', event => {
      const button = event.target.closest('[data-select]');
      if (!button) return;
      selected = button.dataset.select;
      try { localStorage.setItem('yim-style', selected); } catch {}
      render();
    });
  });
  function render() {
    document.querySelectorAll('[data-select]').forEach(button => {
      const active = button.dataset.select === selected;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? 'Selected direction' : 'I like this direction';
      button.closest('article').classList.toggle('selected', active);
    });
    document.querySelectorAll('[data-listening-status]').forEach(status => {
      status.textContent = `${songs.find(song => song[0] === selected)[1]} selected`;
    });
  }
  window.addEventListener('pagehide', () => document.querySelectorAll('audio').forEach(player => player.pause()));
  render();
})();
