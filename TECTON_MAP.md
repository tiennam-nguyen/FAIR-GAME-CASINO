# TECTON Map — Sòng Phẳng Four Seasons

## Mission
Nâng cấp web app ghi điểm nhóm bạn thành bản Four Seasons mobile-first, giữ deploy Vite/Firebase/Vercel đơn giản, ưu tiên correctness của ledger/chốt sổ và không phá dữ liệu cũ một cách âm thầm.

## L0 — SYSTEM
- [READ] React 19 + TypeScript + Vite SPA; Tailwind/shadcn UI; Zustand chỉ persist hồ sơ + theme.
- [READ] Firebase Anonymous Auth là identity; Firestore giữ room / players / transactions và realtime subscriptions.
- [READ] VietQR chỉ tạo image URL; app không xử lý hay xác nhận giao dịch ngân hàng.
- [READ] Vercel phục vụ build `dist`; Firestore Rules phải publish riêng.
- [READ] Game đang hỗ trợ tạo mới: Tiến Lên và Xì Dách; Poker chỉ giữ type để đọc dữ liệu cũ.

## L1 — MODULES
- `src/lib/firebase.ts` → trust boundary Firebase, lifecycle phòng, join, realtime, append/undo ledger.
- `firestore.rules` → authorization + zero-sum/round sequencing guards ở database boundary.
- `src/lib/gameLogic.ts` → pure game rules, ledger-derived balances, debt simplification, VietQR formatting.
- `src/store/useStore.ts` → UI state; không persist room/ledger để tránh resurrect stale session.
- `src/components/screens/*` → Welcome → Dashboard → History / Settlement.
- `src/components/modals/*` → Profile / Create / Join / Score input.
- `src/lib/season.ts`, `SeasonSwitcher.tsx`, `App.css` → four-season theme tokens + auto/manual selection.

## L2 — RELEVANT FLOWS
1. Create: anonymous UID → validated profile → `createRoom()` batch creates room + host player → Dashboard subscribes room/players/transactions.
2. Join: room code → `joinRoom()` Firestore transaction → preserve existing UID state or atomically increment `playerCount` for a new member.
3. Score: host-only ScoreModal → pure calculator → `validateZeroSum()` → `addTransaction()` allocates next round and appends immutable transaction.
4. Display/settlement: players + transaction ledger → `derivePlayerBalances()` → dashboard ranking / `simplifyDebts()` → optional VietQR.
5. Undo: only latest transaction → atomically delete ledger entry + decrement round counter; balances recompute from ledger.
6. Close: `settling` / `closed` status only; history and player docs are retained for reconciliation.

## L3 — V2 FRONTIER
- [RAN:user handover] v1 clean install: 10/10 tests green; lint 10 errors; build stopped on missing `Firestore` type import.
- [READ+FIXED] All four root mechanisms from that reproduction are addressed in source/config.
- [RAN] v2: 10/10 pure regression tests pass; ESLint config parses; dependency lock dry-run resolves 607 packages; TS/TSX transpile sweep has 0 syntax diagnostics.
- [READ+PATCHED] The six production packages named by the user's audit were removed or moved to patched compatible lock versions.
- [UNKNOWN in this runner] Exact `npm run verify` and browser/Firebase E2E because npm registry DNS is unavailable; this remains the handover gate.

## Load-bearing decisions
- Transaction ledger is the money source of truth; `Player.currentScore` is legacy compatibility only.
- Close/leave are non-destructive; no score/history deletion for normal UX actions.
- PIN reclaim was removed rather than preserving weak local identity recovery.
- Firebase web config uses environment variables for environment separation, not as a false secret vault.
- Lint exceptions stay scoped to shadcn UI primitives; application components retain the Fast Refresh rule.
- Dependency security is a repeatable gate (`npm run audit:prod`), not a one-time claim.
