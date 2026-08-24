const universal = require('jest-expo/universal/jest-preset.js');

const expoTransformIgnorePatterns = [
  '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@Expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
  '/node_modules/react-native-reanimated/plugin/',
  '/node_modules/@react-native/babel-preset/',
];

module.exports = {
  ...universal,
  projects: universal.projects.map((project) => ({
    ...project,
    transformIgnorePatterns: expoTransformIgnorePatterns,
  })),
};
