import OpenAI from "openai";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import type {
  AIChatResponse,
  AIConversationMessage,
  AIEntity,
  AIIntent,
} from "../types/ai";

// ── Constants ───────────────────────────────────────────────────────

/** Max records we'll ever send to the LLM as context per entity */
const DATA_LIMIT = 50;

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ── Firestore helpers ───────────────────────────────────────────────

function getDb() {
  const admin = initializeFirebaseAdmin();
  return admin.firestore();
}

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are LabNet Assistant — the AI helper for LabNet Guardian, a network security monitoring system.

LabNet tracks the following data in its database:

1. **devices** — Network devices discovered by scanning.
   Fields: hostname, ip, mac, type, status, bandwidth, lastSeen, createdAt

2. **alerts** — Security alerts raised by the system.
   Fields: id, title, description, device, ip, time, severity (critical | warning | info)

3. **anomalies** — Anomalous network behaviour detected.
   Fields: deviceId, deviceType, hostName, ip, type, severity (low | medium | high), message, userId, createdAt

4. **sessions** — Device connection sessions.
   Fields: deviceId, connectedAt, disconnectedAt, bandwidth, anomaly (boolean)

5. **history** — Activity log of network events.
   Fields: deviceType, hostName, ip, title, type (connection | disconnection | anomaly | update | scan), createdAt, userId

6. **aggregatedTraffic** — Network traffic summaries.
   Fields: numDevices, totalBandwidth, avgBandwidth, timestamp

────────────────────────────────────────────────────────
INSTRUCTIONS:
- When the user asks about data, return mode "data" and fill in the queries array.
- A single question may need data from MULTIPLE entities. For example:
  • "Give me a network overview" → queries for devices, alerts, and traffic
  • "What's going on with device 192.168.1.5?" → queries for devices, alerts, anomalies, and sessions filtered by that IP/device
  • "Are there any security issues?" → queries for alerts and anomalies
- When the user is just chatting, greeting, or asking about LabNet features, return mode "chat".
- You are friendly, concise, and security-aware.
- You may use bold asterisks (e.g. **important**) to highlight key devices, IPs, or alert severities. Use simple line breaks and hyphens (-) for bullet points. Do not use headings (#).
- Always return EXACTLY ONE valid JSON object with this shape:

{
  "mode": "chat" | "data",
  "reply": "<brief natural-language response>",
  "queries": [                      // only when mode is "data"; can contain 1 or more queries
    {
      "entity": "<one of the 6 entity names above>",
      "operation": "list" | "count" | "summary",
      "filters": { ... }            // optional, entity-specific key/value pairs
    }
  ]
}

Filter rules:
- For alerts:   severity, device, time
- For devices:  status, type, ip, hostname
- For anomalies: severity, deviceId, type
- For sessions: deviceId, anomaly (boolean)
- For history:  type, ip
- For aggregatedTraffic: no filters (always returns latest)

Return ONLY valid JSON — no markdown, no explanation outside the JSON.
`;

// ── Data-summarisation prompt (phase 2) ─────────────────────────────

function buildSummarisationPrompt(
  entityDataMap: Record<string, { data: unknown[]; total: number }>,
): string {
  const sections = Object.entries(entityDataMap)
    .map(([entity, { data, total }]) => {
      if (data.length === 0) {
        return `## ${entity}\nNo records found.`;
      }
      return `## ${entity} (${data.length} of ${total} total records)\n${JSON.stringify(data, null, 2)}`;
    })
    .join("\n\n");

  return `
You are LabNet Assistant. The user asked a question that required data from the system.
Here is the data we fetched from the database:

${sections}

Please provide a helpful, concise, natural-language summary that combines insights from ALL the data above.
- Highlight anything important (e.g. critical alerts, high-severity anomalies, devices that are offline).
- If any section is empty, mention it briefly.
- Include specific numbers and device names/IPs where relevant.
- Keep it conversational but informative.
- Do NOT return JSON — return a plain text answer.
- You may use bold asterisks (e.g. **important**) to highlight key devices, IPs, or alert severities. Use simple line breaks and hyphens (-) for bullet points. Do not use headings (#).
`;
}

// ── Entity data fetchers ────────────────────────────────────────────

async function fetchAlerts(
  filters?: Record<string, unknown>,
): Promise<{ data: unknown[]; total: number }> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("alerts");

  if (filters?.severity) {
    query = query.where(
      "severity",
      "==",
      String(filters.severity).toLowerCase(),
    );
  }

  const snapshot = await query.get();
  let results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  // Apply client-side filters that Firestore can't handle well together
  if (filters?.device) {
    const deviceFilter = String(filters.device).toLowerCase();
    results = results.filter((r: any) =>
      r.device?.toLowerCase().includes(deviceFilter),
    );
  }
  if (filters?.time) {
    const timeFilter = String(filters.time).toLowerCase();
    results = results.filter((r: any) =>
      r.time?.toLowerCase().includes(timeFilter),
    );
  }

  const total = results.length;
  return { data: results.slice(0, DATA_LIMIT), total };
}

async function fetchDevices(
  filters?: Record<string, unknown>,
): Promise<{ data: unknown[]; total: number }> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("devices");

  if (filters?.status) {
    query = query.where("status", "==", String(filters.status).toLowerCase());
  }
  if (filters?.type) {
    query = query.where("type", "==", String(filters.type));
  }

  const snapshot = await query.get();
  let results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  if (filters?.ip) {
    const ipFilter = String(filters.ip);
    results = results.filter((r: any) => r.ip?.includes(ipFilter));
  }
  if (filters?.hostname) {
    const hostnameFilter = String(filters.hostname).toLowerCase();
    results = results.filter((r: any) =>
      r.hostname?.toLowerCase().includes(hostnameFilter),
    );
  }

  const total = results.length;
  return { data: results.slice(0, DATA_LIMIT), total };
}

async function fetchSessions(
  filters?: Record<string, unknown>,
): Promise<{ data: unknown[]; total: number }> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("sessions");

  if (filters?.deviceId) {
    query = query.where("deviceId", "==", String(filters.deviceId));
  }

  const snapshot = await query.get();
  let results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  if (filters?.anomaly !== undefined) {
    const wantAnomaly = Boolean(filters.anomaly);
    results = results.filter((r: any) => r.anomaly === wantAnomaly);
  }

  const total = results.length;
  return { data: results.slice(0, DATA_LIMIT), total };
}

async function fetchAnomalies(
  filters?: Record<string, unknown>,
): Promise<{ data: unknown[]; total: number }> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("anomalies");

  if (filters?.severity) {
    query = query.where(
      "severity",
      "==",
      String(filters.severity).toLowerCase(),
    );
  }
  if (filters?.deviceId) {
    query = query.where("deviceId", "==", String(filters.deviceId));
  }

  const snapshot = await query.get();
  const results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  const total = results.length;
  return { data: results.slice(0, DATA_LIMIT), total };
}

async function fetchHistory(
  filters?: Record<string, unknown>,
): Promise<{ data: unknown[]; total: number }> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("history");

  if (filters?.type) {
    query = query.where("type", "==", String(filters.type).toLowerCase());
  }

  const snapshot = await query.get();
  let results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  // Sort in memory to avoid requiring a composite index in Firestore
  results.sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  if (filters?.ip) {
    const ipFilter = String(filters.ip);
    results = results.filter((r: any) => r.ip?.includes(ipFilter));
  }

  const total = results.length;
  return { data: results.slice(0, DATA_LIMIT), total };
}

async function fetchTraffic(): Promise<{ data: unknown[]; total: number }> {
  const db = getDb();
  const snapshot = await db
    .collection("aggregatedTraffic")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  const results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  return { data: results, total: results.length };
}

// ── Entity router ───────────────────────────────────────────────────

const ENTITY_FETCHERS: Record<
  AIEntity,
  (filters?: Record<string, unknown>) => Promise<{ data: unknown[]; total: number }>
> = {
  alerts: fetchAlerts,
  devices: fetchDevices,
  sessions: fetchSessions,
  anomalies: fetchAnomalies,
  history: fetchHistory,
  traffic: () => fetchTraffic(),
};

// ── Main service class ──────────────────────────────────────────────

export class AIService {
  /**
   * Handle an incoming user prompt.
   *
   * 1. Send conversation + system prompt → LLM classifies intent (may request multiple entities)
   * 2. If mode=data → fetch all requested entities in parallel → LLM summarises combined data
   * 3. If mode=chat  → return the LLM reply directly
   */
  async handlePrompt(
    prompt: string,
    messages: AIConversationMessage[] = [],
  ): Promise<AIChatResponse> {
    // ── Phase 1: Classify intent ────────────────────────────────────

    const conversation = this.buildConversation(prompt, messages);

    const intentCompletion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversation,
      ],
    });

    const rawContent = intentCompletion.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No AI response received");
    }

    const intent = this.parseIntent(rawContent);

    // ── Chat mode — return immediately ──────────────────────────────

    if (intent.mode === "chat" || !intent.queries || intent.queries.length === 0) {
      return { mode: "chat", reply: intent.reply };
    }

    // ── Data mode — fetch all entities in parallel + summarise ──────

    return this.fetchAndSummarise(intent.queries, conversation);
  }

  // ── Fetch from Firestore (multi-entity) then ask the LLM to summarise ─

  private async fetchAndSummarise(
    queries: Array<{ entity: AIEntity; operation: string; filters?: Record<string, unknown> }>,
    conversation: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<AIChatResponse> {
    // Fetch all entities in parallel
    const fetchResults = await Promise.all(
      queries.map(async (q) => {
        const fetcher = ENTITY_FETCHERS[q.entity];
        if (!fetcher) {
          return { entity: q.entity, data: [] as unknown[], total: 0 };
        }
        const result = await fetcher(q.filters);
        return { entity: q.entity, ...result };
      }),
    );

    // Build a map of entity → { data, total }
    const entityDataMap: Record<string, { data: unknown[]; total: number }> = {};
    const entities: AIEntity[] = [];

    for (const result of fetchResults) {
      entityDataMap[result.entity] = { data: result.data, total: result.total };
      entities.push(result.entity);
    }

    // Check if we got any data at all
    const totalRecords = fetchResults.reduce((sum, r) => sum + r.total, 0);

    if (totalRecords === 0) {
      return {
        mode: "data",
        entities,
        reply: `I checked ${entities.join(", ")} but found no records${queries.some((q) => q.filters) ? " matching those filters" : ""}.`,
      };
    }

    // ── Phase 2: Summarise all data in a single LLM call ────────────

    const summaryCompletion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: buildSummarisationPrompt(entityDataMap),
        },
        // Include the last user message for context
        ...(conversation.slice(-2) as Array<{ role: "user" | "assistant"; content: string }>),
      ],
    });

    const summaryReply =
      summaryCompletion.choices?.[0]?.message?.content ??
      `Found data across ${entities.join(", ")}.`;

    return {
      mode: "data",
      entities,
      reply: summaryReply,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private buildConversation(
    prompt: string,
    messages: AIConversationMessage[],
  ): Array<{ role: "user" | "assistant"; content: string }> {
    if (messages.length > 0) {
      return messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    return [{ role: "user" as const, content: prompt }];
  }

  private parseIntent(content: string): AIIntent {
    try {
      return JSON.parse(content) as AIIntent;
    } catch {
      // Try to extract JSON from surrounding text
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");

      if (start === -1 || end === -1 || end <= start) {
        throw new Error("Failed to parse AI response as JSON");
      }

      return JSON.parse(content.slice(start, end + 1)) as AIIntent;
    }
  }
}

export const aiService = new AIService();
