# 🚀 Storacle

## Autonomous Procurement & Payments — Powered by HSP

---

## 🌍 Vision

Storacle is building toward a future where **procurement managers are completely replaced**.

Businesses will no longer manually monitor inventory, negotiate invoices, or execute payments.  
Instead, autonomous agents will **observe, decide, and act — continuously**.

At the core of this system is the **HashKey Settlement Protocol (HSP)**, enabling:

- Institutionally compliant payments  
- Verifiable audit trails  
- Trusted supplier settlement  

Storacle replaces human-driven procurement with **programmable, policy-constrained intelligence**.

---

## ⚠️ Note on HSP Integration

The HSP integration in this demo is **partially mocked for demonstration purposes**.

- The full architecture for HSP-based invoice generation, processing, and settlement **is implemented in the repository**
- Some components (especially around production-grade settlement flows) require **final tuning and alignment with HSP infrastructure**

> The system is designed **HSP-first**, and all relevant code paths already exist — this is a matter of refinement, not redesign.

---

## 🧩 System Overview

Storacle is composed of three tightly integrated components:

1. **Frontend (Control Layer)** — Configuration, monitoring, approvals  
2. **Backend (Execution Layer)** — Source of truth, validation, execution  
3. **AI Agents (Decision Layer)** — Autonomous reasoning and actions  

Together, they form a **closed-loop procurement system**:


Inventory → Prediction → Invoice → Verification → Payment → Fulfillment


All financial execution flows through **HSP**, ensuring:

- Compliance  
- Traceability  
- Auditability  

---

# 🖥️ 1. Frontend — Control Layer

The frontend is a **configuration and visibility surface**, not a source of truth.

---

## Responsibilities

- Wallet connection (EIP-1193 / MetaMask)  
- Session policy configuration (Zerodev)  
- Inventory & supplier management  
- Real-time monitoring via SSE  
- Manual confirmations (e.g. goods arrival)  

---

## Key Principles

- ❌ Never holds private keys  
- ❌ Cannot execute payments  
- ❌ Cannot bypass backend validation  
- ✅ Only proposes actions  
- ✅ All actions require backend verification  

---

## Core Features

### 🧠 Agent Configuration

- Supplier whitelisting  
- Spending limits (per supplier, per day)  
- Transaction caps  
- Expiry windows  

---

### 📊 Real-Time Dashboard

- Inventory levels  
- In-transit orders  
- Notifications  
- AI terminal logs  

---

### 📡 Live Updates (SSE)

- Inventory events  
- Agent logs  
- Payment confirmations  
- Notifications  

---

# 🧠 2. Backend — Execution Layer (Source of Truth)

The backend is the **heart of Storacle**.

Everything flows through it:

- State  
- Validation  
- Payments  
- Audit logs  

---

## Responsibilities

- Authentication (Web3 via Supabase)  
- Inventory & supplier state management  
- Task queue + worker execution  
- AI agent orchestration  
- Payment execution via ERC-4337  
- **HSP invoice + settlement integration**  
- Real-time event broadcasting (SSE)  

---

## 🔐 Security Model

- Session keys stored **encrypted (RSA-2048)**  
- Policies enforced **at execution time**  
- Supplier verification required before payment  
- No private keys exposed to frontend  

---

## 💳 Payments via HSP

HSP is not just an integration — it is **core infrastructure**.

---

### Role of HSP

- Invoice generation (via supplier portal)  
- Standardized payment requests  
- Settlement coordination  
- Audit-ready transaction trails  

---

### Flow


Supplier → HSP Invoice → Storacle → Verification → Payment → On-chain settlement


---

### Why HSP Matters

- Ensures **institutional compliance**  
- Provides **consistent invoice standards**  
- Enables **auditable procurement flows**  
- Bridges automation with **real-world financial trust**  

---

## 🧾 Audit & Traceability

Every action in Storacle is logged:

- Inventory events  
- Agent decisions  
- Invoice processing  
- Payment execution  

Combined with HSP:

→ Creates a **fully auditable procurement pipeline**

---

# 🤖 3. AI Agents — Decision Layer

AI agents are responsible for **thinking and acting**.

They do not just automate — they **make decisions**.

---

## 🛒 Procurement Agent

Triggers when inventory changes.

### Responsibilities

- Monitor stock levels  
- Predict depletion (rolling averages)  
- Decide when to reorder  
- Request invoices from suppliers via HSP  

---

## 💸 Payment Agent

Triggers when an invoice is received.

---

### 5-Gate Validation System

1. **Invoice Parsing (OCR)**  
2. **Inventory Check**  
3. **Price Validation**  
4. **Supplier Verification (Policy + On-chain)**  
5. **Payment Execution (ERC-4337)**  

---

Only after passing all gates:

→ Payment is executed via an **HSP-backed flow**

---

## 🧠 Key Insight

Policies defined in the frontend become **hard constraints** on agent behavior.

> The agent is autonomous — but never uncontrolled.

---

# 🔁 End-to-End Flow

## Autonomous Procurement Loop

1. Inventory drops  
2. Agent predicts depletion  
3. Invoice request sent  
4. Supplier generates invoice via HSP  
5. Invoice received and parsed  
6. Validation gates executed  
7. Payment executed  
8. Order marked in-transit  
9. User confirms delivery  
10. Inventory updated  

---

# ⚙️ Architecture Summary

## Frontend
- Next.js  
- SSE client  
- Zerodev policy builder  

## Backend
- Express + Supabase  
- Task queue worker  
- RSA encryption  
- Payment services  

## Blockchain
- ERC-4337 smart accounts  
- Zerodev Kernel  
- Sepolia testnet  

## AI
- Gemini (decision + OCR)  
- LangChain tools  

## Payments
- USDT (testnet)  
- **HSP for invoices + settlement**

---

# 🔐 Future-Proofing Supplier Identity

In production:

- Supplier addresses will **not be hardcoded**  
- **Zero-knowledge proofs (ZK proofs)** will validate supplier identity  

---

### Why This Matters

- HSP settlement may involve **changing addresses**  
- Policies must remain valid across **dynamic identities**  

---

# 🌍 Future Work

Storacle is evolving into a **fully autonomous financial operations layer**.

---

## 💱 Compliant Fiat & Hedging Layer

- Integration with **compliant fiat systems**  
- AI agents will:

  - Convert volatile assets into **stablecoins**  
  - Hedge against inflation automatically  
  - Optimize treasury allocation  

---

### Impact

- Protects businesses in **emerging markets**  
- Reduces exposure to currency instability  
- Enables **globally stable procurement operations**  

---

## 🧠 Advanced Agent Intelligence

- Supplier reliability scoring  
- Dynamic pricing optimization  
- Multi-supplier negotiation strategies  

---

## 🔗 Deeper HSP Integration

- Native settlement confirmations  
- Expanded invoice standards  
- Multi-party payment flows  

---

## 🌐 Multi-Chain Support

- Mainnet deployments  
- Cross-chain payments  
- Expanded token support  

---

## 📊 Analytics & Insights

- Procurement efficiency metrics  
- Spending intelligence dashboards  
- Predictive financial planning  

---

# ✨ Closing Thought

Storacle is not just automating procurement.

It is **redefining it**.

By combining:

- AI decision-making  
- Programmable payments  
- HSP-backed compliance  

…it creates a system where businesses no longer *manage operations* —  
they **define rules**, and the system executes flawlessly.