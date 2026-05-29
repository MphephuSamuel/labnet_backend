export type AIConversationRole = "user" | "assistant";

export interface AIConversationMessage {
  role: AIConversationRole;
  content: string;
}

export interface AIChatRequestBody {
  prompt?: string;
  messages?: AIConversationMessage[];
}

// ── All supported entities ──────────────────────────────────────────

export type AIEntity =
  | "alerts"
  | "devices"
  | "sessions"
  | "anomalies"
  | "history"
  | "traffic";

// ── Per-entity filter shapes ────────────────────────────────────────

export interface AIAlertFilters {
  severity?: string;
  device?: string;
  time?: string;
}

export interface AIDeviceFilters {
  status?: string;
  type?: string;
  ip?: string;
  hostname?: string;
}

export interface AISessionFilters {
  deviceId?: string;
  anomaly?: boolean;
}

export interface AIAnomalyFilters {
  severity?: string;
  deviceId?: string;
  type?: string;
}

export interface AIHistoryFilters {
  type?: string; // connection | disconnection | anomaly | update | scan
  ip?: string;
}

export type AIFilters =
  | AIAlertFilters
  | AIDeviceFilters
  | AISessionFilters
  | AIAnomalyFilters
  | AIHistoryFilters;

// ── Intent from the AI ──────────────────────────────────────────────

export interface AIQuery {
  entity: AIEntity;
  operation: "list" | "count" | "summary";
  filters?: Record<string, unknown>;
}

export interface AIIntent {
  mode: "chat" | "data";
  reply: string;
  queries?: AIQuery[];
}

// ── Response back to the client ─────────────────────────────────────

export interface AIChatResponse {
  mode: "chat" | "data";
  reply: string;
  entities?: AIEntity[];
}
