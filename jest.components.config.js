'use strict';

// Standalone config for React Native Testing Library component tests. Kept separate from
// the main `jest-expo/universal` multi-project suite so a rendering-layer issue here can
// never destabilise the pure tests. Run with `npm run test:components`.
module.exports = {
  preset: 'jest-expo',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/components/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/tests/components/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-android-widget))',
  ],
};
