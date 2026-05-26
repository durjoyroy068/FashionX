const pageModules = {};

export function registerPage(name, initFn) {
  pageModules[name] = initFn;
}

export function getPageModule(name) {
  return pageModules[name];
}
