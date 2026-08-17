# Sòng Phẳng

Sòng Phẳng is a mobile-first scorekeeping app for small card-game groups. It records each round, keeps balances in sync between players, simplifies settlement, and can generate VietQR payment links.

Production: https://fair-game-casino.vercel.app

## Using the app

1. Set a display name and, optionally, payment details for VietQR.
2. One person creates a room and shares its five-character code or the room URL.
3. Other players join the room. A room supports up to four players.
4. The host records rounds and can undo the latest round.
5. At the end, settle and close the room.

Rooms can be shared with `?room=CODE`. Existing members can refresh and return to the same room after Firebase restores their anonymous session. Invalid room links stay on the welcome screen and show an error instead of restoring another room.

## Supported game flows

- Tiến Lên for four players, with “Nhất ăn Bét · Nhì ăn Ba” and “Nhất ăn tất” scoring.
- Xì Dách, where the host is the dealer and the app derives the dealer’s balance.
- Ledger-based balances and debt simplification for settlement.
- VietQR links for recorded recipients. The app does not move money or confirm payment.

Every round is stored in an immutable transaction ledger. Current balances are derived from that ledger, so a reload does not rely on a cached score.

## Realtime and room safety

Firebase Anonymous Authentication identifies each browser session. Firestore synchronizes room membership, scores, undo operations, settlement, and close state in real time.

Firestore Rules enforce room membership, host-only controls, capped joins, zero-sum rounds, and latest-round-only undo. Rooms are not enumerable by clients.

Anonymous identity is stored in browser data. Clearing site data can prevent a browser from being recognized as an existing room member.

## Current release status

The 2026-08-17 release was verified against the production Vercel deployment and Firebase project:

- unit tests: 18/18;
- Firestore Rules emulator tests: 12/12;
- Chromium and Firefox emulator E2E: 4/4;
- production two-client smoke: passed, including a denied outsider mutation;
- production dependency audit: 0 vulnerabilities.

The full release evidence and rollback identifiers are in [TECTON-VERIFICATION-REPORT.md](TECTON-VERIFICATION-REPORT.md).

## Development setup

Requirements: Node.js 24 and npm.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Fill `.env.local` with Firebase Web App values. It is ignored by Git and must not be committed. Enable Anonymous Authentication and create a Firestore database for the target Firebase project.

For production, set the same `VITE_FIREBASE_*` values in Vercel. Firestore Rules are deployed separately:

```bash
firebase deploy --only firestore:rules --project <firebase-project-id>
```

## Testing

```bash
npm test
npm run test:rules
npm run test:e2e
npm run lint
npm run build
npm run verify
```

`npm run verify` runs unit tests, Firestore Rules tests, lint, a production build, and `npm audit --omit=dev`. The E2E suite starts local Auth and Firestore emulators.

A production smoke configuration is kept in `playwright.live.config.ts`. It uses `.env.local`, creates one synthetic room, and leaves it closed. Run it only against the intended production project:

```bash
npx playwright test --config playwright.live.config.ts
```

## Deployment notes

Vercel builds the Vite app with:

```text
Build command: npm run build
Output directory: dist
```

The app and Rules are deployed independently. Do not deploy a change when `npm run verify` is failing.

## Known limitations

- A room supports at most four players.
- Tiến Lên requires exactly four players.
- Poker is not available as a complete game mode.
- Browser online status is a convenience signal, not proof that a player is active.
- Real-device Safari, offline recovery, full keyboard traversal, and screen-reader coverage are outside the current release gate.
- The build currently has a large main bundle and stale Browserslist metadata warning.
