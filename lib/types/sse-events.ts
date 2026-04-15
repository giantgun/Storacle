// -- SSE event types (server-enveloped) --

export type SSEEventType =
  | "inventory_event"
  | "notification"
  | "agent_task"
  | "agent_log"
  | "task_event"
  | "dashboard_update"
  | "ping"
  | "ready";

export interface SSEEventEnvelope {
  type: SSEEventType;
  timestamp: string;
  data: Record<string, unknown>;
  org_id: string;
}

// -- Terminal types --

export type LogType = "info" | "ai" | "success" | "error" | "warning";

export interface TerminalTimelineEntry {
  tool: string;
  input_brief: string;
  output_brief: string | null;
  status: "success" | "failed" | "running";
}

export interface TerminalTask {
  task_header: string;
  agent_name: string;
  entries: TerminalTimelineEntry[];
  reasoning: string | null;
  status: "running" | "completed" | "failed";
  timestamp: string;
  task_id: string;
}

// -- Server-aligned types (matching Supabase schema) --

export interface ServerInventoryItem {
  id: string;
  name: string;
  unit_name: string;
  quantity: number;
  in_transit_quantity: number;
  inventory_capacity: number;
  unit_sales_price_in_usdt: number;
  expected_purchase_price_in_usdt: number;
  supplier_id: string | null;
  critical_order_level: number;
  minimum_bulk_quantity: number;
  supplier_lead_time_days: number;
  is_agent_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ServerSupplier {
  id: string;
  name: string;
  email: string;
  non_custodial_wallet_address: string;
  organization_id: string;
  created_at: string;
}

export interface ServerWallet {
  usdt_balance: number;
  public_session_key_address: string;
  non_custodial_wallet_address: string;
}

export interface InTransitOrder {
  id: string;
  inventory_item_id: string;
  event_type: string;
  quantity_change: number;
  price_per_unit: number;
  metadata: {
    fulfillment_status: string;
    transaction_hash: string;
  };
  created_at: string;
}

// -- Dashboard bootstrap response --

export interface DashboardBootstrapData {
  profile: {
    org_name: string;
    org_id: string;
    first_name: string;
    last_name: string;
    business_email: string;
    smart_account_address: string;
    is_agent_active?: boolean;
  };
  balances: ServerWallet;
  inventory_items: ServerInventoryItem[];
  suppliers: ServerSupplier[];
  notifications: ServerNotification[];
  in_transit_orders: InTransitOrder[];
  pending_tasks_count: number;
  recent_terminal_tasks: TerminalTask[];
}

export interface ServerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata: unknown;
  created_at: string;
}
