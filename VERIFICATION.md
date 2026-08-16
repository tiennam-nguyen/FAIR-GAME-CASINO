# Verification Report — v2

## Status

**AMBER in the delivery sandbox, with the known v1 build/lint reproduction fixed in source.** The remaining blocker is environmental: this sandbox cannot resolve `registry.npmjs.org`, so it cannot perform a clean dependency install and therefore cannot honestly run the repository's ESLint/Vite executables.

The release gate on a normal machine is now one command:

```bash
npm run verify
```

That command runs regression tests, ESLint, TypeScript + Vite production build, and a production-dependency npm audit.

## [RAN] v1 reproduction supplied by the user

On a clean Windows install of v1:

- 10/10 regression tests passed.
- ESLint failed with 10 findings: one effect/state issue, one render-purity issue, seven shadcn Fast Refresh co-export findings, and one banned `@ts-ignore`.
- `tsc -b` failed because `Firestore` was referenced as a type without importing it.

Those outputs define the v2 regression frontier; no other build error was observed before TypeScript stopped.

## [READ + FIXED] v2 build/lint frontier

- `src/lib/firebase.ts` now imports `type Firestore` from `firebase/firestore`.
- `InAppBrowserOverlay.tsx` uses a lazy `useState` initializer instead of synchronously setting state in an effect.
- `SidebarMenuSkeleton` uses a deterministic skeleton width instead of `Math.random()` during render.
- `useWakeLock.ts` uses a typed Wake Lock capability seam; the `@ts-ignore` is gone.
- `react-refresh/only-export-components` is disabled **only** under `src/components/ui/**`, where shadcn-style modules intentionally co-export variants/hooks. The rule remains active for application components.

## [RAN] regression and static checks on v2

Commands/checks executed in the delivery environment:

```bash
npm run test
node --check eslint.config.js
npm ci --dry-run --ignore-scripts --offline
```

Results:

- **10 tests passed, 0 failed.**
- ESLint config parses as valid JavaScript.
- npm accepts the `package.json` / `package-lock.json` dependency tree in a dry-run: **607 packages planned, exit 0**.
- A TypeScript transpile sweep over the project TS/TSX source completed with **0 syntax diagnostics**.
- Targeted regression scan confirms the four known lint/build trigger patterns from v1 are absent.

## [READ + PATCHED] production dependency findings from the user's audit

The v1 `npm audit --omit=dev` report named six production findings. v2 removes the unused direct `uuid` dependency and moves the affected transitive lock entries to patched lines compatible with their existing parent ranges:

- `@grpc/grpc-js` → `1.9.16`
- `@protobufjs/utf8` → `1.1.2`
- `protobufjs` → `7.6.5`
- `lodash` → `4.18.1`
- `websocket-driver` → `0.7.5`
- direct `uuid` → removed

This is **not** a claim that the npm advisory database will remain at zero: advisories change over time. `npm run audit:prod` is therefore part of the release gate.

## [BLOCKED in this sandbox] clean full gate

DNS resolution for `registry.npmjs.org` times out here, and the npm cache does not contain the dependency tarballs. Because `node_modules` cannot be installed, the following are deliberately **not** claimed as run in this environment:

- repository ESLint executable;
- `tsc -b` with the exact locked TypeScript package;
- Vite production bundle;
- browser smoke test of the v2 bundle;
- live Firebase end-to-end test against your new project.

### Handover gate

On your Windows machine, from a fresh extraction:

```powershell
npm ci
npm run verify
```

If that is green, then add your `.env.local` and run:

```powershell
npm run dev
```

Smoke-test with two independent browser sessions: create → join → score → reject invalid score → undo → refresh/rejoin → settle → host/non-host permission checks.

Do not deploy if `npm run verify` is red; send the exact output back and that becomes the next frontier.
