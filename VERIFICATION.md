# Verification Report

## [RAN] Regression logic

Command:

```bash
node --experimental-strip-types --test tests/*.test.mjs
```

Result in the TECTON delivery environment: **10 tests passed, 0 failed**.

Covered invariants:
- Tiến Lên zero-sum in both supported modes.
- Penalties preserve total money and winner self-penalty is ignored.
- Duplicate ranks are rejected.
- Xì Dách derives dealer balance automatically.
- Debt simplification preserves a balanced ledger and rejects imbalance.
- VietQR amount normalization.
- Ledger, not denormalized player score, determines balances.
- Automatic seasons and manual override.

## [RAN] Static integrity

- 76 TS/TSX files parsed/transpiled with the installed TypeScript compiler: **0 syntax diagnostics**.
- Internal relative and `@/` imports checked: **0 missing files**.
- `package.json` and the root dependency graph in `package-lock.json` checked: **consistent**.
- Unused `kimi-plugin-inspect-react` removed from Vite config, package manifest and lockfile.
- Source scan found no raw Firebase web config literal/key pattern.
- Final package excludes `.env.local`, `node_modules`, stale `dist`, logs and caches.

## [READ + independently checked] Firestore boundary

`firestore.rules` now guards:
- authenticated room reads;
- atomic join + max 4 players;
- self-only profile/presence edits;
- host-only transaction creation;
- integer, 2–4 player, unique-player, zero-sum score arrays;
- round counter coupled to transaction create/delete using `getAfter()`;
- undo limited to the latest ledger entry;
- room/player destructive deletes disabled.

## [BLOCKED by environment] Full build/browser verification

The execution sandbox cannot resolve `registry.npmjs.org` (`getent` fails; `curl` DNS resolution times out), so a clean dependency installation cannot complete. Therefore **ESLint, `tsc -b`, Vite production build, and browser smoke tests are not claimed as run**.

Run this immediately after extracting the ZIP in an environment with npm network access:

```bash
cp .env.example .env.local
# fill VITE_FIREBASE_* values
npm ci
npm run check
npm run dev
```

Then publish `firestore.rules` to the matching Firebase project and manually smoke-test:
1. create a Tiến Lên room as host;
2. join until 4 players;
3. score a round and verify zero-sum/ranking;
4. undo latest round;
5. run Xì Dách and verify dealer auto-balance;
6. settle and inspect VietQR data;
7. switch all four seasons on mobile width;
8. close the room and confirm history remains readable.
