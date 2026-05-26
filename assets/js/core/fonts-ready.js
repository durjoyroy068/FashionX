/**
 * Marks document when webfonts are active; uses swap fallbacks until then.
 */
(function () {
  const root = document.documentElement;
  root.classList.add("fonts-pending");

  function markReady() {
    root.classList.remove("fonts-pending");
    root.classList.add("fonts-ready");
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(markReady).catch(markReady);
  } else {
    markReady();
  }

  setTimeout(markReady, 3000);
})();
