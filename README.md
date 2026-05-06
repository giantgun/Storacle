# Storacle

**Autonomous Procurement & Payments** — AI agents that monitor inventory, process invoices, and execute payments within user-defined policy constraints.

---

## Overview

Storacle is a **multi-tenant** platform that replaces manual procurement workflows with programmable, policy-constrained AI agents. Businesses configure spending rules and supplier whitelists, and the system autonomously handles the rest: detecting low stock, emailing suppliers, OCR-ing incoming invoices, validating prices, and executing USDT payments via ERC-4337 account abstraction — with full org-level data isolation across all tenants.

---

## System Architecture

Storacle is composed of two tightly integrated components:

| Component | Role |
|-----------|------|
| **StoracleAgent** | Backend server — source of truth for data, AI agent execution, payment processing, real-time event streaming |
| **StoracleFrontend** | Web dashboard — wallet auth, inventory/supplier management, policy configuration, real-time monitoring |

Together they form a closed-loop procurement system:

```
Inventory → Prediction → Invoice → Verification → Payment → Fulfillment
```

---

## How It Works

### Procurement Pipeline

1. Inventory drops (simulated purchase or live sale)
2. Procurement agent checks stock levels against rolling depletion averages
3. If stock will run out before the supplier can deliver, the agent emails a restock request
4. The supplier responds with an invoice via email

### Invoice Processing Pipeline

1. Supplier email hits the AgentMail webhook → payment task created
2. Payment agent OCRs the invoice (Gemini 2.0 Flash) → extracts product, quantity, price, due date
3. Agent verifies inventory is actually depleted
4. Agent compares invoice price against the expected purchase price
5. **Gate 4**: Agent verifies the supplier is in the user-approved on-chain policy whitelist and the session hasn't expired
6. If all gates pass and the invoice is due soon → agent executes USDT payment via ERC-4337 UserOperation

### Real-Time Monitoring

All agent activity, inventory changes, and notifications stream to the frontend via Server-Sent Events — no polling, no manual refresh.

---

## Repositories

| Repository | Description |
|-----------|-------------|
| [StoracleAgent](./StoracleAgent) | Express + Supabase backend with LangChain AI agents, task queue, ERC-4337 payment execution |
| [StoracleFrontend](./StoracleFrontend) | Next.js dashboard with SIWE authentication, inventory management, Zerodev policy builder |

---

## Demos

| Demo | Description | Link |
|------|-------------|------|
| **Full System Walkthrough** | End-to-end demo of the procurement pipeline: inventory monitoring → supplier email → invoice OCR → policy verification → USDT payment execution | [![Storacle Demo](https://img.youtube.com/vi/Kl8WBsUc_08/maxresdefault.jpg)](https://youtu.be/Kl8WBsUc_08) |

Additional runnable demos are available in the embedded sub-projects — see the individual READMEs for walkthrough scripts and test scenarios.

---

## Security Model

### Multitenant Architecture

Storacle isolates tenants at the **tool layer, not the prompt layer** — the LLM never sees an `organizationId`:

- **Org-scoped tools, not prompts** — `organizationId` is injected into tool constructors (`CreateTaskTool(orgId)`, `PaySupplierTool(orgId)`, etc.), not into the system prompt. The LLM operates on scoped data without knowing tenant boundaries exist.
- **Pre-query filtering** — agent handlers filter DB results by `organizationId` before the LLM ever processes them (e.g., fetching only the calling org's inventory items), so the agent naturally acts within its tenant context.
- **Audit isolation via tool wrappers** — `wrapTool()` attaches `organizationId` to every log entry in `agent_logs`, keeping audit trails per-tenant without the LLM managing the identifier.

### Key Protection Layers

- **Private keys never touch the frontend** — all signing happens in MetaMask (EIP-1193)
- **Session keys encrypted at rest** — RSA-2048 OAEP encryption, decrypted in-memory only during payment execution
- **Spending policies enforced on-chain** — Zerodev PermissionValidator ensures the agent cannot spend outside the configured limits per organization
- **5 validation gates** before any payment executes — OCR, inventory check, price check, on-chain policy verification, due-date check
- **Full audit trail** — every agent decision, tool call, and payment is logged with reasoning and timestamps per organization

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5.7, Tailwind CSS 4, shadcn/ui |
| Backend | Bun, Express 5, Supabase (PostgreSQL + Auth + Realtime) |
| AI Agents | LangChain.js + Gemini 2.5 Flash |
| Invoice OCR | Gemini 2.0 Flash |
| Blockchain | ERC-4337, Zerodev Kernel v3.1, viem |
| Payments | USDT via ERC-4337 UserOperation |
| Email | AgentMail SDK |
| Real-Time | Server-Sent Events (SSE) |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- [pnpm](https://pnpm.io/) 9+
- [Supabase](https://supabase.com/) project
- [Alto](https://github.com/pimlicolabs/alto) or another ERC-4337 bundler
- [AgentMail](https://agentmail.io/) inbox
- MetaMask browser extension

### Quick Start

```bash
# Backend
cd StoracleAgent
cp .env.example .env    # Fill in your credentials
bun install
bun run src/server.ts

# Frontend (separate terminal)
cd StoracleFrontend
pnpm install
pnpm dev
```

See the individual READMEs in each repository for detailed setup instructions and environment configuration.

---

## License

MIT
