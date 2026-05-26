/** Resolve the primary <main> element (skip link + page render target) */
export function getPageMain() {
  return (
    document.getElementById("main-content") ||
    document.getElementById("page-content") ||
    document.querySelector(".page-main")
  );
}

export function setPageContent(html) {
  const main = getPageMain();
  if (!main) return false;
  main.innerHTML = html;
  return true;
}
