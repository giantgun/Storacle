<div align="center">
  <h1>StoracleAgent</h1>
  <p><strong>AI-Powered Procurement Automation Server</strong></p>
  <p>Autonomous inventory monitoring, invoice processing, and USDT payment execution — powered by AI agents and ERC-4337 account abstraction.</p>
  <br/>
  <p>
    <img src="https://img.shields.io/badge/Runtime-Bun-000?style=flat-square&logo=bun" alt="Bun" />
    <img src="https://img.shields.io/badge/Express-5-000?style=flat-square&logo=express" alt="Express 5" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain" alt="LangChain" />
    <img src="https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini" alt="Gemini" />
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

StoracleAgent is the backend for a procurement automation system. It uses AI agents to monitor inventory levels, process supplier invoices, and execute USDT payments — all secured by ERC-4337 account abstraction with Zerodev session policies.

Businesses configure spending limits and supplier whitelists via [StoracleFrontend](https://github.com/your-org/storaclefrontend), and the server autonomously handles the rest: detecting low stock, emailing suppliers for quotes, OCR-ing incoming invoices, validating prices, and paying within policy boundaries.

## How It Works

### Procurement Pipeline

```
Simulated purchase → inventory decremented → procurement task created

Procurement Agent (Gemini 2.5 Flash):
  1. Read current inventory levels
  2. If usage exceeds 50% capacity → calculate depletion rate (7-day rolling average)
  3. If days until critical ≤ lead time + 2 days → email supplier for restock
  4. Log all actions to the real-time event stream
```

The agent only acts on items with `is_agent_active = true`. Each action is logged to `agent_logs` with the agent's reasoning, tool inputs, and tool outputs — making every decision auditable.

### Invoice Processing Pipeline

```
Supplier emails invoice → AgentMail webhook → payment task created

Payment Agent (5 validation gates):
  ├─ Gate 1: OCR — Extract product name, quantity, unit price, total, due date (Gemini 2.0 Flash)
  ├─ Gate 2: Inventory check — Verify the item is actually depleted
  ├─ Gate 3: Price validation — Compare invoice price against expected purchase price
  ├─ Gate 4: Supplier verification — Check Zerodev policy whitelist + session expiry (on-chain)
  └─ Gate 5: Payment execution — RSA-decrypt session key → deserialize permission account → submit UserOperation to bundler
```

All five gates must pass before any on-chain transaction executes. Gate 4 bridges the frontend's policy configuration with on-chain enforcement — the supplier must be in the user-approved whitelist and the session must not be expired.

### Real-Time Events

```
Supabase (postgres_changes on 5 tables)
  → event-listener.service.ts
    → terminal-transformer.ts (enriches agent logs with tool timelines)
      → sse.service.ts (broadcasts to connected clients)
        → GET /events → frontend EventSource
```

All state changes — inventory updates, notifications, agent log entries, task status changes — are broadcast to connected clients within milliseconds.

## Stack

| Category | Technology |
|----------|-----------|
| Runtime | [Bun](https://bun.sh/) |
| Framework | [Express 5](https://expressjs.com/) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime) |
| AI Agents | [LangChain.js](https://js.langchain.com/) + [Gemini 2.5 Flash](https://ai.google.dev/) |
| Invoice OCR | [Gemini 2.0 Flash](https://ai.google.dev/) (vision + text extraction) |
| Blockchain | [viem](https://viem.sh/), [Zerodev Kernel v3.1](https://docs.zerodev.app/), ERC-4337 |
| Email | [AgentMail SDK](https://agentmail.io/) |
| Tunneling | [ngrok](https://ngrok.com/) |
| Package Manager | [Bun](https://bun.sh/) (built-in) |

## Project Structure

```
.
├── src/
│   ├── server.ts                          # Entry point: Express, ngrok, worker spawn, Supabase listener
│   ├── app.ts                             # Express app config (CORS, routes, error handling)
│   │
│   ├── agents/
│   │   ├── procurement.agent.ts           # LangChain agent: inventory monitoring & restock
│   │   └── payment.agent.ts              # LangChain agent: invoice processing & payment
│   │
│   ├── controllers/                       # Express route handlers
│   │   ├── auth.controller.ts             # SIWE authentication, org management
│   │   ├── dashboard.controller.ts        # Bootstrap endpoint (org + inventory + suppliers + notifications)
│   │   ├── inventory.controller.ts        # Inventory CRUD
│   │   ├── suppliers.controller.ts        # Supplier CRUD with wallet validation
│   │   ├── wallet.controller.ts           # Session approval/revoke/status
│   │   ├── keys.controller.ts             # RSA session key derivation
│   │   ├── simulate.controller.ts         # Purchase simulation endpoint
│   │   ├── events.controller.ts           # SSE event stream
│   │   ├── webhook.controller.ts          # AgentMail webhook receiver
│   │   ├── notification.controller.ts     # Notification read/unread
│   │   └── paymaster.controller.ts        # Paymaster operations
│   │
│   ├── services/
│   │   ├── payment.service.ts             # USDT transfer via ERC-4337 UserOperation
│   │   ├── supplier-verification.service.ts # On-chain policy validation (Gate 4)
│   │   ├── inventory.service.ts           # Simulation, depletion prediction, CRUD
│   │   ├── email.service.ts               # Invoice OCR + AgentMail send
│   │   ├── balance.service.ts             # On-chain balance refresh + SSE broadcast
│   │   ├── whale.service.ts               # Whale wallet for simulated USDT transfers
│   │   ├── sse.service.ts                 # SSE client registry + broadcast
│   │   ├── event-listener.service.ts      # Supabase realtime → SSE bridge
│   │   ├── terminal-transformer.ts        # Agent log enrichment for terminal display
│   │   ├── notification.service.ts        # Notification creation
│   │   └── task.service.ts               # Task creation
│   │
│   ├── tools/                             # LangChain StructuredTools
│   │   ├── inventory.tool.ts              # read_inventory_item, predict_depletion, update_inventory
│   │   ├── email.tool.ts                  # read_invoice (OCR), send_invoice_request
│   │   ├── payment.tool.ts               # pay_supplier
│   │   ├── task.tool.ts                  # create_task
│   │   └── notification.tool.ts          # create_notification
│   │
│   ├── tasks/
│   │   ├── task.executor.ts              # Routes task types to agent handlers
│   │   ├── task.queue.ts                 # claim_next_task, completeTask, failTask (Postgres RPC)
│   │   └── tool.logger.ts               # Tool wrapper for audit logging
│   │
│   ├── workers/
│   │   └── task.worker.ts                # Polls DB every 2s, claims and executes tasks
│   │
│   ├── routes/                           # Express routers (one per controller)
│   ├── db/
│   │   ├── supabase.ts                    # Supabase client (service + auth)
│   │   ├── supabase.types.ts             # Generated TypeScript types
│   │   ├── init_tables.sql               # Full schema: 11 tables + functions + triggers
│   │   └── invoice_attachment_migration.sql # Invoice attachment storage
│   ├── utility/
│   │   └── cryptography.ts               # RSA-2048 OAEP encrypt/decrypt
│   ├── types/
│   │   └── task.types.ts                # Task type definitions
│   └── lib/
│       └── chain.ts                      # viem public + wallet client setup
│
├── .env.example
├── tsconfig.json
└── package.json
```

## Database

The schema (`src/db/init_tables.sql`) defines 11 tables and several Postgres functions:

### Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Org profiles, linked to Supabase Auth users |
| `wallets` | Session keys, policy config, smart account addresses |
| `suppliers` | Supplier records with on-chain verification status |
| `inventory_items` | Stock levels, pricing, agent activation per item |
| `inventory_events` | Audit trail: sales, restocks, invoice events, fulfillments |
| `invoices` | Invoice records linked to suppliers |
| `email_inbox` | Inbound supplier emails from AgentMail |
| `crypto_transactions` | On-chain transaction records |
| `agent_tasks` | Task queue (pending, processing, completed, failed) |
| `notifications` | User-facing alerts |
| `agent_logs` | Full audit trail of agent decisions and tool calls |

### Key Functions

- **`claim_next_task(org_id)`** — Atomic task claim using `FOR UPDATE SKIP LOCKED`. Orders by priority then FIFO.
- **`record_supplier_payment(...)`** — Creates invoice-paid event, updates in-transit quantity, marks invoice paid.
- **`confirm_inventory_fulfillment(event_id)`** — Moves in-transit quantity to confirmed stock, creates restock event.
- **`handle_new_org()`** — Trigger on `auth.users` INSERT that auto-creates an organization row.

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Create organization, wallet, and email inbox |
| `POST` | `/auth/signin` | Authenticate via signed SIWE message |
| `GET` | `/auth/signout` | Destroy session cookie |
| `GET` | `/auth/org/` | Fetch org profile and all related data |
| `POST` | `/auth/org/update` | Update organization profile |
| `POST` | `/auth/org/agent` | Toggle AI agent active/inactive |
| `GET` | `/auth/session-address` | Get session key public address |

### Wallet & Session Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/wallet/status` | Session key and policy status |
| `POST` | `/wallet/session-approval` | Store Zerodev approval string and policy config |
| `POST` | `/wallet/session-revoke` | Clear approval and deactivate agent |
| `GET` | `/wallet/balance` | Current USDT balance |

### Inventory & Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/items/add` | Create inventory item |
| `POST` | `/items/edit` | Update inventory item |
| `POST` | `/items/delete` | Delete inventory item |
| `POST` | `/items/transit` | Confirm goods received (in-transit → stock) |
| `POST` | `/suppliers/add` | Create supplier (wallet validated) |
| `POST` | `/suppliers/edit` | Update supplier (wallet validated) |
| `POST` | `/suppliers/delete` | Delete supplier |

### Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/simulate/purchase` | Simulate a sale — decrements stock, sends USDT from whale wallet, triggers procurement task |
| `POST` | `/webhooks/mail` | AgentMail webhook — receives supplier invoice emails |
| `GET` | `/events` | SSE stream for real-time client updates |
| `GET` | `/dashboard/data` | Bootstrap all data for initial page load |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- [Supabase](https://supabase.com/) project with the schema from `src/db/init_tables.sql` applied
- [Alto](https://github.com/pimlicolabs/alto) or another ERC-4337 bundler running locally
- [AgentMail](https://agentmail.io/) inbox for email processing
- RSA-2048 key pair (`master_public_key.pem`, `master_private_key.pem`) for session key encryption

### Environment Configuration

```env
# Required
SUPABASE_URL=                      # Supabase project URL
SUPABASE_SECRET_KEY=               # Service role key (bypasses RLS)
GOOGLE_API_KEY=                    # Gemini API key (agents + OCR)
AGENT_MAIL_API_KEY=                # AgentMail inbox API key
MASTER_SESSION_PRIVATE_KEY=0x...   # Shared session key (hex, 0x-prefixed)
CHAIN_RPC_URL=                     # Sepolia testnet RPC endpoint
USDT_TOKEN_ADDRESS=                # USDT ERC-20 contract on Sepolia
BUNDLER_URL=                       # ERC-4337 bundler URL (e.g., http://localhost:4337)
SERVER_PORT=3000                   # HTTP server port
NGROK_AUTHTOKEN=                   # ngrok authtoken for public webhook URL

# Optional
NODE_ENV=development                # Controls error stack exposure
WHALE_PRIVATE_KEY=                 # Whale wallet for simulated USDT revenue
```

### Installation & Running

```bash
# Install dependencies
bun install

# Start the server (HTTP + SSE listener + ngrok tunnel + worker process)
bun run src/server.ts

# Optionally run the task worker as a standalone process
bun run src/workers/task.worker.ts
```

## Architecture

### Session Key Security

- The master session private key lives **only** in the server's `.env` file — never in the frontend or in transit.
- The public address is exposed to the frontend for policy setup; the private key is encrypted with RSA-2048 and stored in the database.
- Decryption happens in-memory only during payment execution, milliseconds before submitting a UserOperation.
- The Zerodev PermissionValidator enforces policy on-chain — the agent cannot spend outside the user-configured limits even if the server were compromised.

### Task Worker

The worker runs as a child process spawned by `server.ts` (or standalone). It polls the `agent_tasks` table every 2 seconds using `claim_next_task()` — a Postgres function that uses `FOR UPDATE SKIP LOCKED` for safe concurrent access. Tasks are ordered by priority (1 = highest) then FIFO. Routine tasks (`is_routine_task = true`) auto-reschedule on completion or failure.

### Error Handling

- Every controller wraps its logic in try-catch blocks, returning appropriate HTTP status codes (400, 401, 404, 500).
- Tool failures are logged to `agent_logs` with full error context; the agent creates a notification and continues.
- The webhook handler always returns 200 immediately (preventing AgentMail retries) before processing asynchronously.
- Database transaction failures auto-reschedule routine tasks.

## License

[MIT](LICENSE)
