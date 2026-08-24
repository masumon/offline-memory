'use strict';

const universal = require('./node_modules/jest-expo/universal/jest-preset.js');
const safeWarnSetup = require.resolve('./tests/jest-safe-warnings.js');

const projects = (universal.projects || []).map((project) => ({
  ...project,
  watchPlugins: [],
  setupFilesAfterEnv: [
    ...(project.setupFilesAfterEnv || []),
    safeWarnSetup,
  ],
}));

module.exports = {
  ...universal,
  projects,
  watchPlugins: [],
};
