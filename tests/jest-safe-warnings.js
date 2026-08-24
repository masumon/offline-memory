'use strict';

const originalWarn = console.warn;

console.warn = (...args) => {
  const message = args.length > 0 ? String(args[0]) : '';

  if (message.includes("ExpoModulesCoreJSLogger") && message.includes('Cannot read properties of undefined')) {
    return;
  }

  originalWarn(...args);
};
