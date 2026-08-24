'use strict';

const universal = require('./node_modules/jest-expo/universal/jest-preset.js');
const safeWarnSetup = require.resolve('./tests/jest-safe-warnings.js');

const expoTransformIgnorePatterns = [
  '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@Expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
  '/node_modules/react-native-reanimated/plugin/',
  '/node_modules/@react-native/babel-preset/',
];

const projects = (universal.projects || []).map((project) => {
  const { watchPlugins: _watchPlugins, ...projectConfig } = project;
  return {
    ...projectConfig,
    setupFilesAfterEnv: [
      ...(projectConfig.setupFilesAfterEnv || []),
      safeWarnSetup,
    ],
    setupFiles: [
      require.resolve('./jest.setup.js'),
      ...(projectConfig.setupFiles || []),
    ],
    transformIgnorePatterns: expoTransformIgnorePatterns,
  };
});

const { watchPlugins: _watchPlugins, ...universalConfig } = universal;

module.exports = {
  ...universalConfig,
  projects,
};
