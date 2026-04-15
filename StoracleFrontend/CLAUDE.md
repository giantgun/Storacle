# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

Storacle frontend is an AI-powered inventory and treasury management dashboard built with Next.js. It connects to the server backend (Express, port 4000) and provides Web3 authentication, inventory management, supplier management, treasury operations, and an AI terminal interface. For complete system architecture including how frontend, server, and public bundler services interact, see the [Integration Guide](../INTEGRATION.md).

## Tech Stack

- **Next.js 16** (App Router) + React 19
- **TypeScript 5.7** (strict mode)
- **Tailwind CSS 4** with OKLch color space, dark theme by default
- **shadcn/ui** + Radix UI primitives for accessible components
- **React Hook Form + Zod** for form validation
- **Sonner** for toasts
- **ethers.js 6** + **SIWE 3.0** for Web3 auth
- **@tetherto/wdk** wallet dev kit + **ERC-4337** account abstraction
- **IndexedDB** (via `idb`) for local encrypted seed phrase storage
- **AES-GCM** encryption (PBKDF2 key derivation) for local storage

## Directory Structure

```
/src (or /app + /components + /lib)
├── app/                        # Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx                # Redirects to /dashboard or /onboarding
│   ├── dashboard/page.tsx      # Protected dashboard
│   └── onboarding/page.tsx     # Web3 auth (login/signup)
│
├── components/
│   ├── ui/                     # shadcn/ui components (Button, Card, Dialog, etc.)
│   ├── dashboard/              # Dashboard orchestrators
│   │   ├── dashboard-content.tsx
│   │   ├── sections/           # HomeSection, InventorySection, NotificationsSection, ProfileSection
│   │   ├── terminal/           # AI Terminal components
│   │   ├── inventory/          # InventoryManagement.tsx
│   │   ├── suppliers/          # SuppliersList.tsx
│   │   └── common/             # BottomNavigation.tsx, etc.
│   ├── forms/                   # Multi-step forms
│   │   ├── inputs/
│   │   ├── inventory/          # InventoryFormStep1-3
│   │   ├── suppliers/          # SupplierForm
│   │   ├── profile/            # ProfileForm
│   │   └── treasury/           # TreasuryWithdrawForm
│   ├── modals/                  # BaseModal + specialized modals
│   │   ├── sim-purchase/       # SimPurchaseModal
│   │   ├── treasury/           # TreasuryWithdrawModal
│   └── theme-provider.tsx
│
├── lib/
│   ├── actions/                # Server Actions ('use server') — API communication
│   │   ├── auth.ts
│   │   ├── inventory.ts
│   │   ├── profile.ts
│   │   ├── suppliers.ts
│   │   ├── notifications.ts
│   │   └── simulate.ts         # POST /simulate/purchase — triggers inventory + whale USDT transfer
│   ├── types/                  # TypeScript interfaces
│   ├── utils/                  # Helpers (session, etc.)
│   ├── helper.ts               # AES-GCM encryption, IndexedDB, Web3 utilities
│   ├── validator-transactions.ts # EIP-712 signing, session key transactions
│   └── abi.ts                  # Smart contract ABIs (ValidatorModule)
│
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
└── styles/
    └── styles.css              # Tailwind + theme variables
```

## Server Communication

All API calls go through **Next.js Server Actions** (`'use server'` directive) in `/lib/actions/`:

- Base URL: `process.env.NEXT_PUBLIC_SERVER_URL!`
- Auth via HTTP-only cookie `access_token` passed as `Authorization: Bearer {token}`
- Each domain has its own action file

Key backend endpoints used:

| Action | Method | Backend Route |
|--------|--------|---------------|
| `signup()` | POST | `/auth/signup` |
| `login()` | POST | `/auth/signin` |
| `getUserData()` | GET | `/auth/org/` |
| `createInventoryItem()` | POST | `/items/add` |
| `updateInventoryItem()` | PATCH | `/items/update` |
| `deleteInventoryItem()` | DELETE | `/items/delete` |
| `addSupplier()` | POST | `/suppliers/add` |
| etc. | | |

## State Management

**No global state management library** (no Redux, Zustand, etc.). State is managed through:

- **Lifted state** in `DashboardContent` — parent manages state for all tab sections
- **Local `useState`** in components for UI state
- **Server Actions** for data persistence
- **HTTP-only cookies** for session tokens
- **IndexedDB** for encrypted local storage (seed phrases)

## Authentication Flow

### Sign In (SIWE — Sign In With Ethereum)
1. Connect wallet via `@tetherto/wdk`
2. Generate SIWE message with nonce
3. Sign message with wallet
4. POST `/auth/signin` → server verifies Supabase auth + that a `wallets` row exists (rejects 403 if user only triggered the `handle_new_org` trigger but never completed signup) → receives `access_token` cookie
5. Redirect to `/dashboard`

### Sign Up (steps)
1. Connect wallet via MetaMask (EIP-1193)
2. Fill in name, business, email
3. User signs SIWE message via `personal_sign`
4. POST `/auth/signup` → server creates org + wallet + inbox → HttpOnly cookie
5. Redirect to `/dashboard`

### Session Key Transactions (ERC-4337)
- Uses Zerodev Kernel v3.1 + PermissionValidator
- See `lib/zerodev-session-key.ts` for `setupSessionWithPolicies()`, `updateSessionPolicies()`, `revokeSessionKey()`
- Policy config: `lib/zerodev-policies.ts` (CallPolicy, GasPolicy, TimestampPolicy, RateLimitPolicy)
- User signs via EIP-1193 (MetaMask), no private key ever touched by the frontend

### AI Terminal Controls
- **Configure Limits / Edit Limits**: Opens `AgentLimitsForm` modal. Shows "Edit Limits" when `sessionKeyAddress` is set. Modal renders regardless of supplier count — the form handles empty suppliers gracefully in Step 1.
- **Activate**: Disabled unless `sessionKeyAddress` is defined (smart account deployed). Calls `POST /auth/org/agent` with `isAgentActive=true`.
- **Deactivate**: Calls `POST /wallet/session-revoke` → server clears `session_key_approval`, `policy_config`, `smart_account_address` and sets `is_agent_active: false`. Frontend then clears local session state.

## Component Patterns

### Lift State Pattern
```tsx
// DashboardContent lifts state and passes to sections
const [items, setItems] = useState([])
<InventorySection items={items} onUpdate={setItems} />
```

### Server Action Pattern
```tsx
// Called from components
export async function createInventoryItem(item: InventoryItem) {
  const token = cookieStore.get('access_token')?.value
  const res = await fetch(`${baseUrl}/items/add`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  })
  return res.json()
}
```

### Modal Pattern
- `BaseModal` generic wrapper with open/close callbacks
- Modals call server actions internally and close themselves on success (parent container doesn't handle submission)
- Specific modals (AddInventoryModal, etc.) compose with forms as children
- Modal state managed in parent container

### Supplier Wallet Validation
- `SupplierForm.tsx` accepts wallet addresses and passes them through to the server
- Server (`suppliers.controller.ts`) validates with `^0x[0-9a-fA-F]{40}$` regex — returns 400 if invalid
- This prevents invalid addresses (like "Supsswe") from being stored and later breaking Zerodev `toCallPolicy` encoding which expects `bytes32` for the recipient address in USDT transfer ABI
- `BaseModal` generic wrapper with open/close callbacks
- Specific modals (AddInventoryModal, etc.) compose with forms as children
- Modal state managed in parent container

## Styling

- **Tailwind CSS 4** with OKLch color space
- **Dark theme default**: `--background: oklch(0.12 0.01 240)`
- Theme variables in `/styles/styles.css`
- `cn()` utility (clsx + tailwind-merge) for conditional classes
- Mobile-first responsive design with `pb-20`/`pb-32` for bottom nav clearance

## Web3 Configuration

Environment variables in `.env`:
- `NEXT_PUBLIC_PROVIDER_URL` — Sepolia RPC URL (required)
- `NEXT_PUBLIC_BUNDLER_URL` — Public ERC-4337 bundler URL (required)
- `NEXT_PUBLIC_USDT_TOKEN_ADDRESS` — USDT token contract address on Sepolia (required)

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Development server
bun run build        # Production build
bun run start        # Production server
```

## Zerodev Native Session Keys (2026-04-04+)

Non-custodial agent limits managed via Zerodev Kernel with on-chain policy enforcement.

### Architecture

- **Chain**: Sepolia (chain 11155111), RPC: `https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID`
- **Account**: Zerodev Kernel v3.1 with permission-scoped session key via `toKernel` + `toPermissionValidator`
- **Session Key**: ONE shared session key across all orgs (derived from server's `SESSION_KEY_SEED`). Frontend does NOT generate new session keys.
- **Gas**: Self-pay from smart account HSK balance (no paymaster)
- **Flow**: Frontend creates Kernel account with policies, serializes approval string, sends to backend. Backend deserializes with `deserializePermissionAccount` and submits UserOps via `createKernelAccountClient` + `sendUserOperation`.

### Policy Types

| Policy | Purpose | Config Field |
|--------|---------|-------------|
| `CallPolicy` | Supplier whitelist + per-payment max | `suppliers[].address`, `suppliers[].maxPerPayment` |
| `GasPolicy` | Daily spend cap | `maxDailyTotal` |
| `TimestampPolicy` | Session expiry | `expiryTimestamp` |
| `RateLimitPolicy` | Max payments per 24h | `maxDailyTxCount` |

### Frontend Flow

1. User configures limits via `AgentLimitsForm` (4 steps: suppliers, limits, expiry, review)
2. `setupSessionWithPolicies(ownerPk, sessionKeyPk, policyConfig)` creates permission account + serializes approval
3. Approval string stored in IndexedDB + sent to server (`wallets.session_key_approval`)
4. Server verifies suppliers on-chain before paying via Zerodev PermissionValidator whitelist

### Key Files

- `lib/zerodev-session-key.ts` — `setupSessionWithPolicies()`, `revokeSessionKey()`, `checkSessionStatus()`
- `lib/zerodev-policies.ts` — `buildPolicies()` with CallPolicy, GasPolicy, TimestampPolicy, RateLimitPolicy
- `components/dashboard/terminal/AgentLimitsForm.tsx` — 4-step policy configuration UI

### Legacy (Deprecated)

- `lib/validator-transactions.ts` — Custom ValidatorModule with EIP-712 signing (deprecated, replaced by Zerodev)
- `lib/helper.ts:orgTokenTransfer` — Legacy token transfer via ValidatorModule (use server's sendUserOperation instead)

## Important Note

**UPDATE THIS FILE WHEN MAKING LARGE CHANGES.** When you make significant architectural changes, add new patterns, change conventions, or introduce new concepts, update this CLAUDE.md file so future sessions have accurate context.
