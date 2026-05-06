<div align="center">
  <h1>StoracleFrontend</h1>
  <p><strong>AI-Powered Supply Chain Dashboard</strong></p>
  <p>Non-custodial Web3 dashboard for inventory management, treasury operations, and AI procurement agent control.</p>
  <br/>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript 5.7" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS 4" />
  </p>
</div>

---

## Demo

<br/>
<br/>
<div align="center">
  <a href="https://youtu.be/Kl8WBsUc_08">
    <img src="https://img.youtube.com/vi/Kl8WBsUc_08/maxresdefault.jpg" alt="StoracleFrontend Demo" width="90%" />
  </a>
</div>
<br/>
<br/>

---

## Overview

StoracleFrontend is the user-facing interface for an AI-driven procurement automation system. Businesses connect their Ethereum wallet, manage inventory and suppliers, configure spending policies for an AI purchasing agent, and monitor transactions — all without surrendering custody of their keys.

The dashboard operates alongside [StoracleAgent](https://github.com/your-org/storacleagent), a backend server that handles AI agent execution, payment processing, and data persistence.

## Features

| Feature | Description |
|---------|-------------|
| **Wallet Authentication** | Sign-In With Ethereum (SIWE) via MetaMask. No passwords, no custodial key storage. |
| **Inventory Management** | Full CRUD with real-time stock levels, in-transit tracking, and fulfillment confirmation. |
| **Supplier Directory** | Wallet-validated supplier records with on-chain verification status indicators. |
| **AI Agent Terminal** | Live stream of AI procurement and payment agent activity, grouped by task into readable timelines. |
| **Spending Policy Builder** | Multi-step wizard to configure Zerodev session policies — supplier whitelists, per-payment caps, daily limits, and expiry. Policy approvals are signed in-wallet via ERC-4337. |
| **Treasury Dashboard** | On-chain USDT balance display for your smart account. |
| **Simulation Mode** | Trigger simulated purchases to exercise the full procurement pipeline — inventory decrement, whale wallet USDT transfer, and agent task creation. |
| **Real-Time Updates** | All state changes stream via Server-Sent Events — no polling, no manual refresh. |

## Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| Language | [TypeScript 5.7](https://www.typescriptlang.org/) (strict mode) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/) |
| Package Manager | [pnpm](https://pnpm.io/) |
| Web3 | [ethers.js 6](https://docs.ethers.org/), [viem 2](https://viem.sh/), [SIWE 3](https://docs.login.xyz/) |
| Account Abstraction | [Zerodev Kernel v3.1](https://docs.zerodev.app/), ERC-4337, Permissionless.js |
| Forms & Validation | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Real-Time | Native [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) (Server-Sent Events) |
| Local Storage | [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [`idb`](https://github.com/jakearchibald/idb) with AES-GCM encryption |

## Project Structure

```
.
├── app/
│   ├── dashboard/page.tsx       # Authenticated dashboard
│   ├── onboarding/page.tsx      # SIWE login/signup
│   └── page.tsx                 # Root redirect
│
├── components/
│   ├── dashboard/
│   │   ├── dashboard-content.tsx    # Parent orchestrator (lifted state)
│   │   ├── sections/                # Home, Inventory, Notifications, Profile
│   │   ├── terminal/                # AI Terminal, AgentLimitsForm (4-step policy config)
│   │   ├── inventory/               # Inventory & supplier management
│   │   └── common/                  # Bottom navigation, shared layout
│   ├── forms/                       # Multi-step forms (inventory, suppliers, profile, treasury)
│   ├── modals/                      # BaseModal, SimPurchaseModal, etc.
│   └── ui/                          # shadcn/ui primitives
│
├── lib/
│   ├── actions/                     # Next.js Server Actions (API boundary)
│   ├── types/                       # Shared TypeScript interfaces
│   ├── zerodev-session-key.ts       # Permission account lifecycle (setup, update, revoke)
│   ├── zerodev-policies.ts          # Policy definitions (Call, Gas, Timestamp, RateLimit)
│   ├── helper.ts                    # AES-GCM encryption, IndexedDB, Web3 utilities
│   ├── utils.ts                     # cn(), constants, ABI definitions
│   └── utils/session.ts             # Cookie-based session management
│
├── hooks/
│   └── use-sse.ts                   # SSE hook with typed handlers and auto-reconnect
│
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **MetaMask** browser extension
- A running instance of [StoracleAgent](https://github.com/your-org/storacleagent) (backend)
- An ERC-4337 bundler (e.g., [Alto](https://github.com/pimlicolabs/alto))

### Environment

```env
NEXT_PUBLIC_PROVIDER_URL=<Sepolia RPC URL>
NEXT_PUBLIC_BUNDLER_URL=<ERC-4337 bundler URL>
NEXT_PUBLIC_USDT_TOKEN_ADDRESS=<USDT contract address on Sepolia>
NEXT_PUBLIC_SERVER_URL=<Backend API URL>
```

### Installation

```bash
pnpm install
pnpm dev
```

The dev server runs on `http://localhost:3000` by default.

### Production

```bash
pnpm build
pnpm start
```

## Authentication Flow

1. User connects MetaMask via `eth_requestAccounts`
2. Frontend requests a nonce from the backend and constructs a [SIWE](https://eips.ethereum.org/EIPS/eip-4361) message
3. User signs the message via `personal_sign` — the wallet, not the frontend, handles the private key
4. Signed message is posted to the backend's `/auth/signin` or `/auth/signup` endpoint
5. Backend verifies the signature via Supabase Auth and returns an HttpOnly cookie
6. All subsequent API calls include the cookie automatically — no token management in JavaScript

## Spending Policy Configuration

The AI agent requires explicit spending limits before it can transact. Users configure these in a four-step wizard:

| Step | Action |
|------|--------|
| **Step 1** | Select suppliers and set per-payment maximums |
| **Step 2** | Configure global limits (daily total cap, max transaction count) |
| **Step 3** | Set session expiry duration |
| **Step 4** | Review and sign the policy bundle via MetaMask |

The frontend constructs a Zerodev PermissionAccount with [CallPolicy](https://docs.zerodev.app/), GasPolicy, TimestampPolicy, and RateLimitPolicy, serializes the approval string, and persists it to the backend. The backend verifies these policies on-chain before executing any payment.

## Real-Time Terminal

Agent activity streams to the dashboard in real time. Each task is rendered as an expandable timeline:

```
[Procurement Agent] Checking stock levels for PART-A-001
├─ read_inventory_item → 15 of 100 units (15% capacity)
├─ predict_depletion → 2.1/day, critical in 3 days
├─ send_invoice_request → emailed supplier@acme.com for 200 units
└─ create_notification → "Invoice requested from Acme Corp"
```

This is powered by a native [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) connection to the backend's SSE endpoint, with automatic reconnection on disconnect.

## Architecture Philosophy

**The frontend is a consumer, not an owner.** All state mutations go through Server Actions → HTTP API. The backend is the source of truth for data, auth, and execution. The frontend configures policy, proposes actions, and displays state — it never touches private keys, never executes payments, and never writes to the database directly.

## License

[MIT](LICENSE)
