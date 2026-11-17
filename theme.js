// Runs before first paint so dark mode / palette never flash the wrong colours.
(function () {
  var t = null, p = null;
  try { t = localStorage.getItem('rd-theme'); p = localStorage.getItem('rd-pal'); } catch (e) {}
  if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.pal = p || 'jungle';
})();
