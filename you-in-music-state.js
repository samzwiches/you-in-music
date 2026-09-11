(() => {
  const KEY = 'yim-order-state-v3';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function write(patch) {
    const next = { ...read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function getSound() {
    return localStorage.getItem('yim-style') || read().sound_style || '';
  }

  window.YIM = { read, write, getSound, clear: () => localStorage.removeItem(KEY) };
})();
