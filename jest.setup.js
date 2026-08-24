const originalWarn = console.warn;

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes("An error occurred while requiring the 'ExpoModulesCoreJSLogger' module")
  ) {
    return;
  }
  originalWarn(...args);
};
