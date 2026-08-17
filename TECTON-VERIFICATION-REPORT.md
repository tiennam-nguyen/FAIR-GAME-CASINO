# Production Verification Report

Date: 2026-08-17
Release: final production verification release
Production URL: https://fair-game-casino.vercel.app
Firebase project: `song-phang-production`

## Release status

Production verification passed for the defined release scope. The Vercel production build and the tested Firestore Rules are deployed.

## What was verified

### Build and dependencies

- React and React DOM are 19.2.3. No React Server Components package or plugin is installed.
- The production dependency audit reported 0 vulnerabilities.
- The production build completed successfully. The current main JavaScript bundle is 877.06 kB raw and 272.32 kB gzip.

### Firestore security

The Rules test suite covers authentication, room enumeration, host controls, room and player schemas, atomic creation and joins, the four-player cap, concurrent joins, zero-sum rounds, immutable transactions, latest-only undo, and post-close writes.

The suite passed 12/12 tests in the Firestore emulator.

The production Rules deployment was checked before and after release:

- target project: `song-phang-production`;
- deployed Rules blob: `083743c89ba2e278577bc7d9cd25f1b562f7da66`;
- previous production Rules blob: `ab82e88e45918eda2eda020d742f208869e47caa`, also available as `567bf8e:firestore.rules`.

The prior Rules release remains in Firebase Rules history and can be recovered from that Git object if rollback is required.

### Multiplayer production flow

One synthetic room was created in production and left closed. Two independent browser contexts verified:

- room creation and a lowercase deep link;
- profile setup and joining;
- realtime membership updates;
- reload recovery for both clients;
- host-only scoring;
- score propagation, undo, settlement, and close propagation;
- reload of the closed room.

Before the rest of the production flow ran, an independent anonymous identity tried to close the synthetic room directly. Firestore denied the request with HTTP 403.

### Room URLs and reload recovery

`?room=CODE` is the room-sharing contract. Codes are normalized and validated, unrelated query parameters and URL hashes are preserved, and invalid explicit links do not restore a different persisted room.

### Game logic and settlement

Unit coverage includes Tiến Lên and Xì Dách scoring, zero-sum settlement, invalid/empty/non-finite inputs, VietQR amount handling, ledger-derived balances, season boundaries, and room URL handling.

## Test results

- Unit tests: 18/18 passed.
- Firestore Rules tests: 12/12 passed.
- Emulator E2E: 4/4 passed in Chromium and Firefox.
- Production smoke: passed in Chromium with two independent client contexts.
- Lint: passed.
- Production build: passed.
- Production dependency audit: 0 vulnerabilities.

## Production deployment

Vercel deployment `dpl_2TMPmvZX4o13mkVSaPcQbik2Esba` reached `READY` and serves the canonical domain. A live `?room=ABCDI` probe returned the expected invalid-room message.

Firestore Rules were deployed with:

```bash
firebase deploy --only firestore:rules --project song-phang-production
```

## Known non-blocking items

- `npm audit` reports five moderate findings in the development-only `firebase-tools` dependency chain. The available automatic fix requires a breaking downgrade, so it was not applied.
- Vite warns about the large main bundle.
- Browserslist metadata is stale.
- Separate production Firebase action latency percentiles were not collected.
- Real-device Safari, offline recovery, screen-reader traversal, and a full keyboard audit were not part of this release gate.

## Reproducing verification

```bash
npm test
npm run test:rules
npm run test:e2e
npm run lint
npm run build
npm run verify
```

`npm run verify` includes unit tests, Firestore Rules tests, lint, build, and the production dependency audit. The production smoke is intentionally separate because it creates a synthetic room:

```bash
npx playwright test --config playwright.live.config.ts
```

## Release conclusion

The deployed application and Firestore Rules passed the local, emulator, and defined production checks. The remaining items are follow-up hardening and observability work, not release blockers.
