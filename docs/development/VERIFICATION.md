# M0 verification

Run from the repository root:

```bash
npm install
npm run typecheck
npm run lint
npm test
npx expo start
```

Then validate Android on a development device/build:

```bash
npx expo run:android
```

Do not merge M0 until these checks are green in a local Android development environment.
