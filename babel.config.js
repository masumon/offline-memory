module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    overrides: [
      {
        test: /node_modules[\\/]@react-native[\\/]jest-preset[\\/]jest[\\/]setup\.js$/,
        presets: [['@babel/preset-typescript', { ignoreExtensions: true }]],
      },
    ],
  };
};
