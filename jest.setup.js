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

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidNotificationPriority: { HIGH: 'HIGH', MAX: 'MAX', DEFAULT: 'DEFAULT', LOW: 'LOW', MIN: 'MIN' },
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('os-notification-1'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

// Expo Sharing pulls browser-only react-native-web modules into Node/Jest.
// Keep the native implementation completely out of the Jest module graph.
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));
