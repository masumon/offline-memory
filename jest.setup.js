/* global jest */
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

// Expo Sharing pulls browser-only react-native-web modules into Node/Jest.
// Keep the native implementation completely out of the Jest module graph.
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));
