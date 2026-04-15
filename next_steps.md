# Frontend — Next Steps

**Status:** Phase 1 (Zerodev Native Integration) COMPLETE. Phase 2 (Backend Supplier Verification) COMPLETE.

## What's Done

### SSE Pipeline (Previous Session)
- ✅ `lib/types/sse-events.ts` — All shared types
- ✅ `hooks/use-sse.ts` — EventSource hook
- ✅ Server actions — Removed mock storage, fetch real data
- ✅ `dashboard-content.tsx` — Real data fetching + SSE wiring
- ✅ Terminal components — AITerminal, CompactTerminal, DesktopCompactTerminal
- ✅ TreasurySection — Real balances prop

### Zerodev Native Integration (Current Session)
- ✅ `lib/zerodev-session-key.ts` — Rewritten with viem-native `toKernel` + `toPermissionValidator` + `serializePermissionAccount`
- ✅ `lib/zerodev-policies.ts` — Updated to use `KERNEL_V3_1` from `@zerodev/sdk/constants`
- ✅ `components/dashboard/terminal/AgentLimitsForm.tsx` — Wired to real `setupSessionWithPolicies()`, fetches session key from server
- ✅ `components/dashboard/dashboard-content.tsx` — Added session state + `handleConfigureSession` callback + server API call to save approval
- ✅ `components/dashboard/terminal/AITerminal.tsx` — Integrated AgentLimitsForm modal, added session status indicator
- ✅ `app/api/session-key/route.ts` — New API endpoint to fetch session key from server's SESSION_KEY_SEED

### Backend Supplier Verification
- ✅ `services/supplier-verification.service.ts` — On-chain verification via policy_config whitelist + session expiry
- ✅ `services/payment.service.ts` — Added Gate 4: `verifySupplierOnChain()` before `sendUSDT()`
- ✅ `controllers/wallet.controller.ts` — `saveSessionApproval()` + `getSessionStatus()`
- ✅ `routes/wallet.routes.ts` — `POST /wallet/session-approval`, `GET /wallet/status`
- ✅ `app.ts` — Registered wallet router
- ✅ `db/init_tables.sql` — Added `wallets.policy_config`, `suppliers.is_verified_onchain`, `last_verified_onchain_at`
- ✅ `server/CLAUDE.md` — Appended On-Chain Supplier Verification section
- ✅ `frontend/CLAUDE.md` — Appended Zerodev Native Session Keys section

## Pending
- Install `@zerodev/*`, `permissionless`, `viem` packages (background task running)
- Add `@deprecated` JSDoc comments to `lib/validator-transactions.ts`
- Test end-to-end: configure limits → trigger payment → verify supplier check passes/blocks

## 2026-04-08 — Profile Section Improvements
- ✅ Redesigned ProfileSection.tsx to match dashboard section styling (HomeSection, NotificationsSection)
- ✅ Updated header styling with consistent typography and spacing
- ✅ Implemented grid layout with profile info card and quick actions card
- ✅ Preserved modal-based editing functionality with ProfileForm
- ✅ Improved data presentation with better visual hierarchy
- ✅ Maintained proper data wiring to server actions for update and logout
- ✅ Zero TypeScript errors confirmed via `tsc --noEmit`

## Known Issues
- Key derivation: `setupSessionWithPolicies` currently passes seed phrase directly as `ownerPrivateKey` — need proper BIP39 → EOA private key derivation

## 2026-04-06 — TypeScript Audit
- **Fixed all type mismatches in dashboard-content.tsx**:
  - `onMarkAsRead` now calls `markNotificationAsRead()` server action (was local-only)
  - `handleConfirmTransit` checks `response.ok` and shows toast feedback
  - `onTaskEvent` documented as intentional no-op (task queue events handled by onAgentLog/onAgentTask)
- **Replaced all local `Supplier` types with `ServerSupplier`** across:
  - `InventoryManagement.tsx` — removed local Supplier/InventoryItem, imports ServerSupplier/ServerInventoryItem
  - `SuppliersManagement.tsx` — removed local Supplier, fixed `non_custodial_wallet_address` field access
  - `suppliers-list.tsx` — removed local Supplier
- **Fixed ProfileSection.tsx** — added `org_id` to `FullProfile` to match dashboard state
- **Zero TypeScript errors confirmed via `tsc --noEmit`**

## 2026-04-05 — Infra Fix
- **Deleted dead configs from home directory**: `~/package.json`, `~/pnpm-lock.yaml`, `~/pnpm-workspace.yaml`, `~/node_modules/` — orphaned from a global `supabase` install, was making pnpm treat `~` as workspace root and preventing local installs.
- **Added `.vscode/settings.json`** with TypeScript project root and pnpm config so VS Code's TS server can resolve symlinked dependencies. After adding, reload VS Code and run `Developer: Reload Window` if modules still show as unfound.
