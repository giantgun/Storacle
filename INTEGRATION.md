# Storacle Integration Guide

How the frontend and server work together. The **server is the source of truth** - the frontend consumes, configures, and approves. Nothing originates on the frontend that the server does not verify, store, or execute.

---

## Core Architecture

The user's **private key is NEVER handled by the frontend**. Everything goes through their connected non-custodial wallet (MetaMask via EIP-1193). The server is the source of truth for all state.

Sepolia Testnet has **public ERC-4337 bundler services**, so we use standard infrastructure instead of self-hosted solutions. Both the server (for automated payments) and the frontend (for Zerodev session setup) send `UserOperation`s to the public bundler. It processes and bundles them into on-chain transactions on Sepolia Testnet.

```
                    ┌─────────────┐
                    │   Browser   │
                    │  (Frontend) │
                    │ MetaMask    │← User's wallet
                    │  (EIP-1193) │   (only signer)
                    └──────┬──────┘
             UI State Mgmt │ Zerodev Policy Builder
             SIWE + Wallet │ SSE Consumer
                    ┌──────┴──────┐
          HTTP API │ HTTP Cookie │ SSE Stream
          (access_token)         │ (real-time events)
                    ┌──────┴──────┐
                    │    Server   │
                    │  (Express)  │
                    └──────┬──────┘
         Task Worker       │
     (separate process)    │
         AI Agents         │ RSA-2048 + Session Key
         Supabase          │   (only here, never frontend)
                    ┌──────┴───────┐
                    │  Bundler     │
                    │  (Public)    │← ERC-4337 bundler
                    └──────┬───────┘
                    ┌──────┴───────┐
                    │   Database    │
                    │  (Supabase)   │
                    └──────────────┘
```

---


---

## 1. Authentication

The server owns all authentication. The frontend is a consumer.

### Server (source of truth)

- **`POST /auth/signup`** — Creates organization, wallet record, agent inbox via `supabase.auth.signInWithWeb3()` with `{ chain: "ethereum" }`. Supabase manages nonce generation internally. After auth success: creates `wallets` row (zero balances), `email_inbox` record, returns access_token for HttpOnly cookie.
- **`POST /auth/signin`** — Same Web3 flow. Signs in via Supabase, then verifies a `wallets` row exists (only created during signup, not by the `handle_new_org` trigger). Rejects 403 if not found. Returns cookie.
- **`GET /auth/signout`** — Destroys cookie.
- **`GET /auth/org/`** — Full org data via `orgData()`: org info + all related data (notifications, inventory, suppliers, wallets, agent logs within 1h).
- **`POST /auth/org/update`** — Update org profile.
- **`POST /auth/org/agent`** — Toggle `is_agent_active`, opt tx hash.
- **`GET /auth/session-address`** — Session key public address.

**Auth middleware**: `checkAuthentication()` validates JWT via `auth.getUser(token)`.

### Organization Auto-Creation

`handle_new_org()` SQL trigger fires on `auth.users` INSERT → creates `organizations` row with `id = user.id`, `is_agent_active = false`. No explicit org creation needed.

### Frontend Flow

1. `eth_requestAccounts` → connect MetaMask
2. `getAuthNonce()` → server sets 16-byte hex nonce cookie
3. Build SIWE message, user signs via `personal_sign`
4. POST `/auth/signup` or `/auth/signin` → verify
5. `createSession(token)` → HttpOnly cookie (1h)
6. Redirect to `/dashboard`

### Key files

| Side | File |
|------|------|
| Server | `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/server/src/controllers/auth.controller.ts` |
| Frontend | `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/frontend/app/onboarding/page.tsx`, `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/frontend/lib/actions/auth.ts`, `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/frontend/lib/utils/session.ts` |

---

## 2. Session Keys & Zerodev Policy Flow

### Architecture

Session key private key lives **only on server**. Frontend only sees **public address**.

```
Server                                    Frontend
  │  MASTER_SESSION_PRIVATE_KEY (.env)     │
  │  └─ derive public addr ─────────────→ │
  │                                        │ User configures AgentLimitsForm
  │                                        │ MetaMask signs (EIP-1193)
  │  serialized approval string ←──────── │
  │  └─ stores in wallets                  │
  │  Paying invoice:                       │
  │  └─ RSA decrypt → deserialize → send   │
```

### What Server Controls

1. **Session key generation** — ONE shared master key from `.env`, derived for all orgs
2. **Session key encryption** — RSA-2048, stored in `wallets.encrypted_session_key`
3. **Approval storage** — Zerodev permission string in `wallets.session_key_approval` + `policy_config` JSONB
4. **Supplier verification** — Checks whitelist + expiry before every payment
5. **Payment execution** — Decrypts key, deserializes, sends UserOperation

### What Frontend Controls

1. **Policy config** — Supplier whitelist, caps, expiry via `AgentLimitsForm` (4 steps)
2. **Approval signing** — Creates Kernel smart account, user signs via MetaMask
3. **No paymaster** — Self-pay from smart account HSK balance

### Complete Flow

```
Step 1: GET /auth/session-address → server returns public address only

Step 2: AgentLimitsForm 4 steps:
  ├─ Step 1: Select suppliers + max USDT/payment
  ├─ Step 2: Global limits (daily cap, max txs)
  ├─ Step 3: Session expiry (days)
  └─ Step 4: Review summary

Step 3: setupSessionWithPolicies(provider, sessionKeyAddress, policyConfig)
  ├─ buildPolicies() → [CallPolicy, GasPolicy, TimestampPolicy, RateLimitPolicy]
  ├─ toSigner(provider) → viem LocalAccount
  ├─ toEmptyECDSASigner(address) — no private key needed
  ├─ Creates PermissionValidator + Kernel account + PermissionAccount
  ├─ serializePermissionAccount() → approval string
  └─ Returns: { serializedApproval, sessionKeyAddress, smartAccountAddress, policyConfig, expiryTimestamp }

Step 4: POST /wallet/session-approval → stores + verifyAllSuppliersForOrg()

Step 5: Payment: verifySupplierOnChain → RSA decrypt → deserialize → send UserOp
```

**Key detail**: `toEmptyECDSASigner(sessionKeyPublicAddress)` only needs an address — no private key. Creates a `ModularSigner`. Server later deserializes with the real private key.

### Smart Account Lifecycle

| Function | When | What |
|----------|------|------|
| `setupSessionWithPolicies()` | First time | Creates Kernel + policies, serializes approval |
| `updateSessionPolicies()` | Edit limits | New policies, replaces stored approval |
| `revokeSessionKey()` | Disable | Bare Kernel account (no plugins) |
| `checkSessionStatus()` | Check | Verifies approval valid, not expired |


### AI Terminal Controls

| Button | Requires | Action |
|--------|----------|--------|
| Configure Limits / Edit Limits | — | Opens `AgentLimitsForm` (4 steps). "Edit Limits" shown when session exists |
| Activate | Existing `sessionKeyAddress` (smart account deployed) | Calls `POST /auth/org/agent` to enable agent. Disabled without smart account |
| Deactivate | Agent is active | Calls `POST /wallet/session-revoke` — clears session approval, policy_config, smart_account_address, and deactivates agent |

### Chain & Account

- **Chain**: Sepolia (11155111), RPC: `https://sepolia.infura.io/v3/...` (or Alchemy/RPC provider)
- **Account**: Zerodev Kernel v3.1 + `toPermissionValidator`
- **Gas**: Sponsored by Singleton Paymaster contract (self-pay fallback available)
- **USDT**: 6 decimals

### Policy Config (`wallets.policy_config`)

```json
{
  "suppliers": ["0x..."],
  "max_per_payment": { "0x...": 5000 },
  "daily_total_cap": 25000,
  "daily_tx_cap": 10,
  "expiry_timestamp": 1746489600
}
```

| Policy | Purpose |
|--------|---------|
| `CallPolicy` | Supplier whitelist + per-payment max |
| `GasPolicy` | Daily spend cap |
| `TimestampPolicy` | Session expiry |
| `RateLimitPolicy` | Max payments/24h |

### Key files

| Side | File |
|------|------|
| Frontend | `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/frontend/lib/zerodev-session-key.ts`, `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/frontend/lib/zerodev-policies.ts` |
| Frontend | `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/frontend/components/dashboard/terminal/AgentLimitsForm.tsx` |
| Server | `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/server/src/controllers/keys.controller.ts`, `src/controllers/wallet.controller.ts` |
| Server | `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/server/src/services/supplier-verification.service.ts`, `/mnt/c/Users/Benjamin Ofem/Documents/Storacle/server/src/services/payment.service.ts` |

---

## 3. Database Schema

All in `server/src/db/init_tables.sql`.

### Tables (11 total)

**organizations** — id (FK auth.users), name, business_email, first_name, last_name, agent_inbox_id (unique), is_agent_active (default false)

**wallets** — id, org_id (FK), public_session_key_address, non_custodial_wallet_address, usdt_balance, encrypted_session_key, session_key_approval, policy_config (jsonb), smart_account_address

**suppliers** — id, org_id (FK), name, email, non_custodial_wallet_address, is_verified_onchain, last_verified_onchain_at

**inventory_items** — id, org_id, name, unit_name, unit_sales_price_in_usdt, expected_purchase_price_in_usdt, quantity, in_transit_quantity, inventory_capacity, supplier_id (FK), critical_order_level, minimum_bulk_quantity, supplier_lead_time_days, is_agent_active, timestamps

**inventory_events** — id, org_id (FK), inventory_item_id (FK), event_type (sale|restock|invoice_requested|invoice_received|invoice_paid|manual_adjustment|fulfilled), quantity_change, price_per_unit, reference_id, reference_type, metadata (jsonb)

**invoices** — id, org_id, supplier_id, inventory_item_id, invoice_number, total_amount, currency, due_date, invoice_url, status (pending|paid|scheduled)

**email_inbox** — id, org_id, agent_inbox_id, sender, subject, body, attachments (text[]), processed

**crypto_transactions** — id, org_id, wallet_id, type, status, amount, currency, destination_address, blockchain_tx_hash

**agent_tasks** — id, org_id, agent_name, task_type (procurement.inventory_check|payment.process_invoice), status (pending|processing|completed|failed), priority (1=highest), payload (jsonb), result (jsonb), is_routine_task, scheduled_for

**notifications** — id, org_id, title, message, type (alert|success|info), read, metadata

**agent_logs** — id, org_id, task_id (FK), agent_name, action_taken, status (tool_started|tool_completed|tool_failed), thought, metadata (jsonb: tool_input, tool_output, error)

### Key Functions

**`claim_next_task(org_id)`** — Uses `FOR UPDATE SKIP LOCKED`. Filters `status='pending' AND scheduled_for <= now()`. Orders by `priority ASC, created_at ASC`. Marks as 'processing'. One task per call.

**`record_supplier_payment(payment_amount, supplier_id, inventory_item_id, org_id, due_date)`** — Creates `invoice_paid` event with `{ fulfillment_status: 'pending' }`, increments `in_transit_quantity`, creates/updates invoice row.

**`confirm_inventory_fulfillment(inventory_event_id)`** — Sets `metadata.fulfillment_status = 'fulfilled'`, moves `in_transit_quantity` → `quantity`, creates `restock` event.

**`handle_new_org()`** — Trigger on `auth.users` INSERT. Creates `organizations` row.

**`set_updated_at()`** — Trigger on `inventory_items`, `suppliers` UPDATE. Sets `updated_at = now()`.

---

## 4. Bootstrap Data — Initial Dashboard Load

`GET /dashboard/data` returns everything in one call:

```json
{
  "profile": { "org_name": "..." },
  "balances": { "usdt_balance": 0, "public_session_key_address": "0x...", "non_custodial_wallet_address": "0x..." },
  "inventory_items": [...], "suppliers": [...], "notifications": [...],
  "in_transit_orders": [...], "pending_tasks_count": N,
  "recent_terminal_tasks": [TerminalTask, ...]
}
```

- `in_transit_orders`: `inventory_events` where `event_type='invoice_paid' AND metadata.fulfillment_status='pending'`
- `recent_terminal_tasks`: Last 50 `agent_logs`, grouped by `task_id`, transformed via `buildTerminalTask()`

**Key file**: `server/src/controllers/dashboard.controller.ts`

---

## 5. Real-Time Updates — SSE Pipeline

### Pipeline

```
Supabase postgres_changes (5 tables)
  → event-listener.service.ts
    → terminal-transformer.ts (enriches agent_logs)
      → sse.service.ts (broadcasts to clients)
        → GET /events → Frontend EventSource
```

### SSEService

- Singleton, manages `Array<{ id, orgId, userId, res: Response }>`
- Clients register with `org_id`, receive typed broadcasts
- Heartbeat every **25 seconds**
- Cleanup on client `close`

### Event Types

| Type | Source | Frontend Use |
|------|--------|-------------|
| `inventory_event` | `inventory_events` INSERT | Update stock levels, event timeline |
| `notification` | `notifications` INSERT | Toast + notification list |
| `agent_log` | `agent_logs` INSERT (streaming) | Append to terminal in real-time |
| `agent_task` | `agent_logs` grouped by `task_id` | Terminal task complete/fail |
| `task_event` | `agent_tasks` UPDATE | Pending task indicators |
| `dashboard_update` | `inventory_items` UPDATE | `{ type: "inventory_snapshot" | "balance_update", ... }` |
| `ping` / `ready` | Server | Keep-alive |

### Payload Format

```json
{ "type": "notification", "timestamp": "2025-...", "data": { ... }, "org_id": "..." }
```

### Frontend

- **`hooks/use-sse.ts`** — `new EventSource(baseUrl + '/events', { withCredentials: true })`
- Auto-reconnect 3s on disconnect (native EventSource)
- Handlers: `onInventoryEvent`, `onNotification`, `onAgentLog`, `onAgentTask`, `onDashboardUpdate`, `onTaskEvent`

### Key files

| Side | File |
|------|------|
| Server | `src/services/sse.service.ts` |
| Server | `src/services/event-listener.service.ts` |
| Server | `src/services/terminal-transformer.ts` |
| Server | `src/controllers/events.controller.ts` |
| Frontend | `hooks/use-sse.ts` |

---

## 6. Procurement Automation Pipeline

```
POST /simulate/purchase { item_id, quantity_sold }
  → Server: Decrement quantity, log sale event
  → Server: If is_agent_active=true, create procurement.inventory_check task

Worker (2s poll): claim_next_task() → executeTask()
  → Procurement Agent (Gemini 2.5 Flash):
     1. read_inventory_item() — check capacity
     2. If usage > 50%: predict_depletion() — 7-day rolling avg
     3. If days_until_critical <= lead_time + 2: send_invoice_request()
     4. Emails supplier via AgentMail

SSE broadcasts agent_log → Frontend terminal shows real-time
```

### LangChain Agent Pattern

- Model: `ChatGoogleGenerativeAI` with `gemini-2.5-flash`
- Pattern: `model.bindTools(tools)` + `agent.invoke([SystemMessage, HumanMessage])`
- All tools wrapped by `wrapTool()` — logs before/after to `agent_logs`

---

## 7. Payment Pipeline (Invoice Processing)

```
Supplier emails invoice → AgentMail → POST /webhooks/mail
  → Store in email_inbox, create payment.process_invoice task
  → Worker claims task → Payment Agent (Gemini 2.5 Flash):
     Gate 1: read_invoice() — OCR via Gemini 2.0 Flash
     Gate 2: Check inventory actually depleted
     Gate 3: Compare invoice price vs expected_purchase_price_in_usdt
     Gate 4: verifySupplierOnChain() — whitelist + expiry
     Gate 5: If due soon: pay_supplier() → sendUSDT()
       → RSA decrypt session key
       → deserialize Zerodev approval
       → send UserOp → record_supplier_payment() RPC
       → SSE broadcast

Frontend: "Confirm Goods Arrived"
  → POST /items/transit { inventory_event_id }
  → confirm_inventory_fulfillment() RPC
  → in_transit_quantity → quantity, restock event
  → SSE broadcast
```

### The 5 Payment Gates

| Gate | Where | What |
|------|-------|------|
| 1 | Payment Agent | Parse/OCR invoice — extract product, qty, price |
| 2 | Payment Agent | Verify inventory is depleted |
| 3 | Payment Agent | Price within expected range? |
| 4 | `verifySupplierOnChain()` | Supplier in `policy_config.suppliers` + session not expired |
| 5 | `paySupplierService()` → prepare UserOp → submit to bundler | Decrypt → deserialize → prepare UserOp → submit to bundler |

**Gate 4 is the critical cross-cutting point** — the frontend's policy configuration directly controls what the server is allowed to pay.

### Key files

| File | Purpose |
|------|---------|
| `src/agents/payment.agent.ts` | Orchestrates Gates 1-3 |
| `src/services/payment.service.ts` | Gates 4-5, sendUSDT, record_supplier_payment |
| `src/services/supplier-verification.service.ts` | Gate 4: verifySupplierOnChain |

---

## 8. Task Queue System

### Two Task Types

| Task | Trigger | Priority | Agent |
|------|---------|----------|-------|
| `procurement.inventory_check` | Purchase simulation + `is_agent_active=true` | 2 | Procurement Agent |
| `payment.process_invoice` | Email with attachment | 1 | Payment Agent |

### Worker Loop

- `src/workers/task.worker.ts` polls every **2 seconds**
- Uses `Bun.spawn()` from `server.ts`
- Simple `while(true)` loop, `sleep(2000)` when no task
- Claims via `claim_next_task()` RPC (`FOR UPDATE SKIP LOCKED`)
- Routes to `task.executor.ts` → handler → `completeTask()` or `failTask()`
- **Routine tasks** (`is_routine_task=true`) auto-reschedule

### Key files

| File | Purpose |
|------|---------|
| `src/workers/task.worker.ts` | Poll loop + execution |
| `src/tasks/task.queue.ts` | claim_next_task, completeTask, failTask |
| `src/tasks/task.executor.ts` | Routes task_type to agent handler |

---

## 9. AI Agents & LangChain Tools

### Models

| Model | Use |
|-------|-----|
| `gemini-2.5-flash` | Procurement agent, Payment agent |
| `gemini-2.0-flash` | Invoice OCR (ReadInvoiceTool) |

### Tool List

| Tool | Schema | What |
|------|--------|------|
| `ReadInventoryItemTool` | empty | Returns full item row |
| `PredictDepletionTool` | empty | daily_consumption_rate, days_until_critical, supplier_lead_time_days |
| `UpdateInventoryTool` | `{ quantity }` | Updates stock |
| `ReadInvoiceTool` | empty | OCRs invoice URL → product_name, quantity, unit_price, total_amount, supplier_address, due_date |
| `SendInvoiceRequestTool` | `{ quantity }` | Generates + sends email via AgentMail |
| `PaySupplierTool` | `{ supplierAddress, amount, inventoryItemId, quantity }` | Calls paySupplierService |
| `CreateTaskTool` | `{ task_type, priority, payload?, scheduled_for? }` | Queue tasks |
| `CreateNotificationTool` | `{ title, message }` | Send notification |

### Tool Logging

Every tool wrapped by `wrapTool()` — logs `tool_started` → `tool_completed` or `tool_failed` to `agent_logs` with org_id, task_id, agent_name.

---

## 10. Cryptography

### Server-side (Session Keys)

- **RSA-2048** with OAEP, SHA-256
- Key files: `master_public_key.pem`, `master_private_key.pem`
- `encryptKey(sessionKeyHex)` → publicEncrypt → base64
- `decryptKey(encryptedBase64)` → privateDecrypt → sessionKeyHex
- Key only decrypted in memory during payment execution

### Frontend-side (Local Storage)

- All signing is done via MetaMask (EIP-1193) — **no passwords, no seed phrases handled by the frontend**
- AES-GCM encryption for local IndexedDB storage (encrypted seed phrases for wallet recovery)

---

## 11. Server Startup & Process Model

`server.ts` orchestrates startup:

1. Initialize Supabase realtime listener
2. Register routes (`server/src/routes/`)
3. Start Express server on default port 3000
4. `Bun.spawn()` launches task worker child process
5. If `NGROK_AUTHTOKEN`: create ngrok tunnel, register `/webhooks/mail` with AgentMail SDK

**Routes wired in** `server/src/routes/` — one router per controller.

### Key Files

| File | Role |
|------|------|
| `src/server.ts` | Entry point, Express setup, spawns worker, ngrok |
| `src/routes/` | Express routers |

---

## 12. Simulate Purchase & Whale Wallet

### Flow

```
User clicks "Sim Purchase" → SimPurchaseModal (item + qty)
  → POST /simulate/purchase
  → Server: decrement inventory, log sale event, create procurement task if agent active
  → Server: sendUSDTFromWhale() — transfer USDT from whale wallet to org's smart account
  → Server: refreshAndBroadcastBalance() — SSE broadcasts updated on-chain balance
  → Frontend: balance & inventory update via SSE stream (auto)
```

### Whale Wallet (`server/src/services/whale.service.ts`)

- Configured via `WHALE_PRIVATE_KEY` in server `.env`
- Lazy-init: returns `{ success: false }` if key or `USDT_TOKEN_ADDRESS` is not set (doesn't crash server startup)
- Sends USDT to the org's `wallets.smart_account_address` — amount = `quantity_sold` ($1 per unit)
- Uses the same Sepolia Testnet public client + viem wallet client as the payment service
- On success, calls `refreshAndBroadcastBalance()` which reads the new on-chain balance and SSE-broadcasts it to the frontend

### Key files

| Side | File | Purpose |
|------|------|---------|
| Server | `src/services/whale.service.ts` | USDT transfer from whale to org smart account |
| Server | `src/services/inventory.service.ts` `simulatePurchaseService()` | Orchestrates simulation + whale transfer + balance refresh |
| Server | `src/controllers/simulate.controller.ts` | `POST /simulate/purchase` endpoint |
| Frontend | `lib/actions/simulate.ts` | Server Action wrapper for `/simulate/purchase` |
| Frontend | `components/modals/sim-purchase/SimPurchaseModal.tsx` | Item + qty selector modal |
| Frontend | `components/dashboard/sections/HomeSection.tsx` | "Sim Purchase" button in page header |

---

## 13. Error Handling

- Try-catch in every controller, 500 on failure
- RPC errors fail the task but auto-reschedule if routine
- Webhook handler always returns 200 immediately (prevents retries)
- Tool failures logged, propagate to agent, agent creates notification
- Missing auth → 401, missing fields → 400, invalid IDs → 404

---

## 13. Environment Variables

### Server (`.env`)

```
SUPABASE_URL                    — Database + auth (required)
SUPABASE_SECRET_KEY             — Service role key (required)
GOOGLE_API_KEY                  — Gemini API for agents and OCR (required)
AGENT_MAIL_API_KEY              — Email inbox API for webhook processing (required)
MASTER_SESSION_PRIVATE_KEY      — Shared session key private key (hex, 0x prefixed) (required)
CHAIN_RPC_URL                   — Sepolia RPC URL (required)
USDT_TOKEN_ADDRESS              — ERC-20 USDT contract address on Sepolia (required)
BUNDLER_URL                     — Local Alto bundler URL (e.g., http://localhost:4337) (required)
SERVER_PORT                     — HTTP port (default 3000) (required)
NGROK_AUTHTOKEN                 — Optional: ngrok tunnel for public webhook access
NODE_ENV                        — Development vs production (optional, defaults to development)
```

> **Note**: All environment variables listed above are actively referenced in the codebase.

### Frontend (`.env.local`)

```
NEXT_PUBLIC_PROVIDER_URL        — Sepolia RPC URL (required)
NEXT_PUBLIC_BUNDLER_URL         — Local Alto bundler URL (must match server's BUNDLER_URL) (required)
NEXT_PUBLIC_USDT_TOKEN_ADDRESS  — USDT token contract address (required)
```

> **Note**: Dead code has been removed as of 2026-04-06. All environment variables listed above are actively used in the codebase.


---

## 14. All Endpoints

### Authentication

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| POST | `/auth/signup` | `auth.controller.ts` | Web3 signup |
| POST | `/auth/signin` | `auth.controller.ts` | Web3 signin |
| GET | `/auth/signout` | `auth.controller.ts` | Sign out |
| GET | `/auth/org/` | `auth.controller.ts` | Fetch org data |
| POST | `/auth/org/update` | `auth.controller.ts` | Update org profile |
| POST | `/auth/org/agent` | `auth.controller.ts` | Toggle agent active |
| GET | `/auth/session-address` | `auth.controller.ts` | Session key address |

### Inventory

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/items/add` | Create inventory item |
| POST | `/items/edit` | Update inventory item |
| POST | `/items/delete` | Delete inventory item |
| POST | `/items/transit` | Confirm fulfillment |

### Suppliers

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/suppliers/add` | Create supplier |
| POST | `/suppliers/edit` | Update supplier |
### Suppliers

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/suppliers/add` | Create supplier (validates wallet address) |
| POST | `/suppliers/edit` | Update supplier (validates wallet address) |
| POST | `/suppliers/delete` | Delete supplier |

**Supplier wallet validation**: All supplier wallet address fields are validated as hex addresses (40-char) on both server (regex) and frontend (`form.tsx`). Invalid addresses → 400 with error.

### Wallet & Session

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/wallet/status` | `wallet.controller.ts` | Session key status |
| POST | `/wallet/session-approval` | `wallet.controller.ts` | Save approval + policy_config |
| POST | `/wallet/session-revoke` | `wallet.controller.ts` | Clear approval, policy_config, smart_account_address + deactivate agent |
| GET | `/wallet/balance` | `wallet.controller.ts` | Get wallet balance |

### Other

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| POST | `/simulate/purchase` | `simulate.controller.ts` | Simulate purchase |
| POST | `/webhooks/mail` | `webhook.controller.ts` | AgentMail webhook (no auth) |
| GET | `/events` | `events.controller.ts` | SSE event stream |
| GET | `/dashboard/data` | `dashboard.controller.ts` | Bootstrap initial data |

---

## 15. Data Model Mapping

### Server ↔ Frontend Types

| Server Table / Column | Frontend Type |
|----------------------|---------------|
| `inventory_items.*` | `ServerInventoryItem` |
| `suppliers.*` | `ServerSupplier` |
| `notifications.*` | `ServerNotification` |
| `organizations.*` | `UserProfile` (partial) |
| `wallets.usdt_balance` | `balances.usdt` |
| `wallets.policy_config` | Built by AgentLimitsForm |

### ServerInventoryItem Extra Fields

`in_transit_quantity`, `is_agent_active`, `organization_id`, `expected_purchase_price_in_usdt`, `created_at`, `updated_at`

When frontend `InventoryItem` type doesn't match server `ServerInventoryItem`, server type is authoritative.

---

## 16. Server vs Frontend Responsibility

| Concern | Server | Frontend | Bundler |
|---------|--------|----------|---------|
| Auth | ✅ JWT, Supabase, nonces | ✅ Sign messages, POST | ❌ |
| Session key | ✅ Generate, encrypt, store | ❌ Receives address only | ❌ |
| Policy config | ❌ Stores what's sent | ✅ User configures via AgentLimitsForm | ❌ |
| Approval signing | ❌ Cannot sign | ✅ MetaMask creates Kernel account | ❌ |
| Approval storage | ✅ Stores approval + policy_config | ❌ Sends once | ❌ |
| Supplier verification | ✅ Gate 4 checks | ❌ Cannot bypass | ❌ |
| Payment execution | ✅ Decrypt, deserialize, send UserOp | ❌ Cannot trigger | ✅ Bundles & submits UserOp on-chain |
| Session setup UserOps | ❌ | ✅ Sends UserOp for approval | ✅ Bundles & submits UserOp on-chain |
| Invoice OCR | ✅ Gemini 2.0 Flash | ❌ Display only | ❌ |
| Procurement decisions | ✅ Agent decides from data | ❌ Display only | ❌ |
| Fulfillment | ✅ RPC updates | ✅ User clicks confirm | ❌ |
| Real-time events | ✅ Supabase → SSE | ✅ EventSource | ❌ |
| Database | ✅ All tables, functions, triggers | ❌ No direct access | ❌ |

**Golden rule**: Server owns state. Frontend proposes, server disposes.

---

## 17. Quick Reference: Where to look for X

| Question | Files |
|----------|-------|
| How does authentication work? | Server: `src/controllers/auth.controller.ts` |
| How does a user save inventory? | Frontend: `lib/actions/inventory.ts` → POST `/items/add` |
| How does the agent know when to order? | Server: `src/agents/procurement.agent.ts`, `src/tools/inventory.tool.ts` |
| How are invoices processed & paid? | Server: `src/agents/payment.agent.ts` → `src/services/payment.service.ts` |
| How are session keys created? | Server: `src/controllers/keys.controller.ts`, Wallet: `src/controllers/wallet.controller.ts` |
| How does the frontend approve sessions? | Frontend: `lib/zerodev-session-key.ts`, `lib/zerodev-policies.ts` |
| How does Gate 4 verification work? | Server: `src/services/supplier-verification.service.ts` |
| How does the terminal get real-time? | Server: `src/services/sse.service.ts` + Client: `hooks/use-sse.ts` |
| How does the worker claim tasks? | Server: `src/workers/task.worker.ts`, `src/tasks/task.queue.ts` |
| How does the dashboard load? | Server: `src/controllers/dashboard.controller.ts` |
| What's the DB schema? | Server: `src/db/init_tables.sql` |
| How are session keys encrypted? | Server: `src/utility/cryptography.ts` |

---

## 18. Audit Findings & Fixes (2026-04-06)

### Critical Bugs — Fixed

| # | Bug | What Changed |
|---|-----|-------------|
| 1 | Wallet controller reads `req.user?.organization_id` but auth middleware sets `req.user.id` | Changed all occurrences to `(req as any).user?.id` in `wallet.controller.ts` (3 lines) and `notification.controller.ts` (1 line) |
| 2 | Gate 4 supplier verification crashes — expects `string[]` but frontend sends `Array<{address: string, maxPerPayment: string}>` | Updated `verifySupplierOnChain()` and `verifyAllSuppliersForOrg()` to parse suppliers as `Array<{ address: string }>` |
| 3 | Profile save only updates local state, never hits server | Added `updateUserProfile()` server action in `profile.ts` that calls `POST /auth/org/update`. ProfileSection calls it before updating local state. Fixed `logout()` to call `GET /auth/signout` (was a `setTimeout` simulation) |
| 4 | `MASTER_SESSION_PRIVATE_KEY` not set — `.env` had `SESSION_KEY_SEED` as 12-word seed phrase | Replaced with `MASTER_SESSION_PRIVATE_KEY=0x...` hex private key |
| 5 | `destroySession()` references undefined `SESSION_COOKIE` constant | Changed to `delete(ACCESS_TOKEN_COOKIE)` |
| 6 | `deleteNotification()` calls non-existent `DELETE /notifications/:id` endpoint | Removed `deleteNotification()`, added `PATCH /notifications/:id/read` endpoint |
| 7 | Supplier deletion `.single()` throws when 2+ inventory items reference the same supplier | Changed to `.limit(1)` array query with length check |

### Config Fixes — Sepolia Testnet (Chain 11155111)

| Location | Before | After |
|----------|--------|-------|
| `frontend/.env` `NEXT_PUBLIC_PROVIDER_URL` | `https://sepolia.infura.io/v3/...` | `https://sepolia.infura.io/v3/...` |
| `frontend/.env` `NEXT_PUBLIC_BUNDLER_URL` | Local Alto bundler URL (e.g., http://localhost:3000) | Local Alto bundler (update port to match `ALTO_PORT`) |
| `server/.env` `CHAIN_ID` | `11155111` | `11155111` |
| `server/.env` `BUNDLER_URL` | Local Alto bundler URL (e.g., http://localhost:3000) | Local Alto bundler URL (must match frontend's NEXT_PUBLIC_BUNDLER_URL) |
| `server/.env` `PROVIDER_URL` | missing | `https://testnet.hsk.xyz` |
| `server/.env` | Removed `NEXT_PUBLIC_*` vars (frontend-only) | Clean |

> **Note**: Both `NEXT_PUBLIC_BUNDLER_URL` and `BUNDLER_URL` must point to the local Alto instance (`http://localhost:<ALTO_PORT>`). The port must not conflict with another service.

### Still Known Issues (Not Critical)

| Issue | Impact |
|-------|--------|
| Agent toggle sends unused `hash` parameter from frontend | No current impact — dead parameter, server ignores it |
| `deleteNotification()` removed from frontend but `onDelete` prop still wired in `NotificationsSection` → only updates local state (no server call) | User sees notification removed locally; it'll reappear on refresh. Server-side notification deletion not implemented |

### Frontend Error Fixes

| # | Bug | What Changed |
|---|-----|-------------|
| 1 | **`TreasurySection.tsx` — unclosed `<div>`** causing TS17008, TS1381, TS1005 errors. Balance Summary wrapper never closed, JSX structure was broken | Added missing `</div>` to close the Balance Summary wrapper before Currency Breakdown section (4 TS errors fixed) |
| 2 | **`AITerminal.tsx` — 8 unused imports and dead code** — `WalletManagerEvmErc4337`, `ethers`, `usdtTokenAddress`, `validatorModuleAddress`, `getSessionAddress`, `AgentLimitItem` interface, and password-related state (`showPasswordModal`, `password`, `passwordPurpose`, `isConfirmingPassword`) were imported/defined but never used | Removed all unused imports, dead interface, and password state. Fixed `handleActivateDeactivate` to actually call `toggleAgentActiveForOrg()` with `onAgentToggle()` fallback |
| 3 | **`utils.ts` — missing `cn` function** — removed when cleaning up password utilities, but imported by **50+ shadcn UI components** — entire UI would fail to render | Restored `cn` function (clsx + tailwind-merge) to `utils.ts`. Merged `helper.ts` exports (`validatorABI`, all token address constants, `cexPublicAddress`, `swapProtocolPublicAddress`) into `utils.ts` |
| 4 | **`helper.ts` — dead module** — no files imported it, duplicated all code from `utils.ts` (password utilities, constants, ABI) | Deleted `helper.ts`, all exports moved to consolidated `utils.ts` |

