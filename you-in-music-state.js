(() => {
  const KEY = 'yim-order-state-v3';
  const LEGACY_SOUND_KEY = 'yim-style';

  const soundTitles = {
    before: 'Before I Knew You',
    idea: 'Probably a Terrible Idea (Remix)',
    moments: 'These Are the Moments',
    boys: 'My Boys Are Coming Home',
    harmony: 'Here Me (Harmony Mix)',
    remix: 'Here Me (Remastered) (Remix)'
  };

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function write(patch) {
    const next = { ...read(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent('yim:state', { detail: next }));
    return next;
  }

  function getSound() {
    const state = read();
    if (state.sound_style) return state.sound_style;
    try { return localStorage.getItem(LEGACY_SOUND_KEY) || ''; }
    catch { return ''; }
  }

  function getSoundTitle() {
    const state = read();
    const id = getSound();
    return state.sound_title || soundTitles[id] || '';
  }

  function setSound(id, title) {
    try { localStorage.setItem(LEGACY_SOUND_KEY, id); } catch {}
    return write({
      sound_style: id,
      sound_title: title || soundTitles[id] || ''
    });
  }

  function summary() {
    const state = read();
    return {
      feeling: state.feeling || '',
      story_center: state.story_center || '',
      phrase: state.phrase || '',
      place: state.place || '',
      tiny_detail: state.tiny_detail || '',
      ending_feeling: state.ending_feeling || '',
      sound_style: getSound(),
      sound_title: getSoundTitle(),
      selected_tier: state.selected_tier || ''
    };
  }

  function getStory() {
    const state = read();
    return state.story_room && typeof state.story_room === 'object' ? state.story_room : {};
  }

  function writeStory(patch) {
    const nextStory = { ...getStory(), ...patch };
    return write({ story_room: nextStory });
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(LEGACY_SOUND_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent('yim:state', { detail: {} }));
  }

  window.YIM = {
    read,
    write,
    getSound,
    getSoundTitle,
    setSound,
    summary,
    getStory,
    writeStory,
    clear,
    soundTitles
  };
})();