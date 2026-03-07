(function () {
  var saved = localStorage.getItem('rh-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  function syncIcon() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var btn = document.getElementById('theme-toggle');
    btn.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  syncIcon();

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rh-theme', next);
    syncIcon();
  });
})();
