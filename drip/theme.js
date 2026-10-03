(function () {
  var saved = localStorage.getItem('rh-theme') || 'light';
  if (saved !== 'light' && saved !== 'dark') saved = 'light';
  apply(saved);

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#110e10' : '#f3efe9');
  }

  function syncButton() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = dark
      ? '<i class="fas fa-sun" aria-hidden="true"></i>'
      : '<i class="fas fa-moon" aria-hidden="true"></i>';
    var label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncButton();
    document.getElementById('theme-toggle').addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      var next = dark ? 'light' : 'dark';
      apply(next);
      localStorage.setItem('rh-theme', next);
      syncButton();
    });
  });

  window.setTimeout(function () {
    if (window.__dripReady) return;
    var state = document.getElementById('post-state');
    if (!state || state.dataset.ready === '1') return;
    state.innerHTML =
      '<div class="state-card"><h1>Drip did not start</h1><p>The page scripts could not be loaded. Check your connection and refresh.</p></div>';
    var card = document.getElementById('post-card');
    if (card) card.setAttribute('aria-busy', 'false');
  }, 15000);
})();
