'use strict';

const universal = require('./node_modules/jest-expo/universal/jest-preset.js');
const safeWarnSetup = require.resolve('./tests/jest-safe-warnings.js');
const reactNativeWebPlatformMock = require.resolve('./tests/mocks/react-native-web-platform.js');
const reactNativeWebNativeEventEmitterMock = require.resolve('./tests/mocks/react-native-web-native-event-emitter.js');
const expoFileSystemMock = require.resolve('./tests/mocks/expo-file-system.js');
const expoDocumentPickerMock = require.resolve('./tests/mocks/expo-document-picker.js');

const expoTransformIgnorePatterns = [
  '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@Expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
  '/node_modules/react-native-reanimated/plugin/',
  '/node_modules/@react-native/babel-preset/',
];

const projects = (universal.projects || []).map((project) => {
  const { watchPlugins: _watchPlugins, ...projectConfig } = project;
  return {
    ...projectConfig,
    // RNTL component tests run under their own config (jest.components.config.js) with
    // react-test-renderer — they must not be picked up by the universal multi-env suite.
    testPathIgnorePatterns: [
      ...(projectConfig.testPathIgnorePatterns || ['/node_modules/']),
      '<rootDir>/tests/components/',
    ],
    setupFilesAfterEnv: [
      ...(projectConfig.setupFilesAfterEnv || []),
      safeWarnSetup,
    ],
    setupFiles: [
      require.resolve('./jest.setup.js'),
      ...(projectConfig.setupFiles || []),
    ],
    moduleNameMapper: {
      ...(projectConfig.moduleNameMapper || {}),
      '^react-native-web/dist/exports/Platform$': reactNativeWebPlatformMock,
      '^react-native-web/dist/exports/NativeEventEmitter$': reactNativeWebNativeEventEmitterMock,
      '^expo-file-system$': expoFileSystemMock,
      '^expo-document-picker$': expoDocumentPickerMock,
    },
    transformIgnorePatterns: expoTransformIgnorePatterns,
  };
});

module.exports = {
  ...universal,
  projects,
};
