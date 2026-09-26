import { getSetting } from "./db";
import {
  appendShoppingLine,
  completeItem,
  createItem,
  getTodayBundle,
  listItems,
  listTrackers,
  logCycleInstall,
  monthSummary,
  openCycleStatus,
  setRateSegment,
} from "./items";
import type { ItemType } from "./types";
import { todayISO } from "./utils";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_due",
      description: "List overdue, due today, and upcoming household items plus cylinder alerts",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_items",
      description: "Search places, tasks, care, payments, dates by text",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string" },
          type: {
            type: "string",
            enum: ["place", "task", "care", "date", "payment", "shopping"],
          },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_item",
      description:
        "Propose creating an item for user confirmation. Do not invent data.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["place", "task", "care", "date", "payment", "shopping", "inbox"],
          },
          title: { type: "string" },
          notes: { type: "string" },
          dueAt: { type: "string", description: "YYYY-MM-DD" },
          amount: { type: "number" },
          locationLabel: { type: "string" },
          mapsUrl: { type: "string" },
          recurrence: {
            type: "string",
            enum: ["none", "daily", "weekly", "monthly", "yearly"],
          },
          assignee: { type: "string", enum: ["me", "partner", "either"] },
        },
        required: ["type", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_item",
      description: "Create an item immediately when user clearly confirmed",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["place", "task", "care", "date", "payment", "inbox"],
          },
          title: { type: "string" },
          notes: { type: "string" },
          dueAt: { type: "string" },
          amount: { type: "number" },
          locationLabel: { type: "string" },
          mapsUrl: { type: "string" },
          recurrence: { type: "string" },
          assignee: { type: "string" },
        },
        required: ["type", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_item",
      description: "Mark item done or roll next due for recurring",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_shopping_line",
      description: "Add a line to the grocery shopping list",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tracker_status",
      description: "Status of milk/gas and other trackers",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "log_cycle_install",
      description: "Log gas cylinder (or similar) installed today or on a date",
      parameters: {
        type: "object",
        properties: {
          trackerName: { type: "string" },
          installedAt: { type: "string" },
          expectedDays: { type: "number" },
          pricePaid: { type: "number" },
        },
        required: ["trackerName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_rate_segment",
      description:
        "Change milk (or similar) daily quantity from a date; previous period closes automatically",
      parameters: {
        type: "object",
        properties: {
          trackerName: { type: "string" },
          effectiveFrom: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
        },
        required: ["trackerName", "effectiveFrom", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tracker_month_summary",
      description: "Monthly quantity and cost for a rate tracker like milk",
      parameters: {
        type: "object",
        properties: {
          trackerName: { type: "string" },
          year: { type: "number" },
          month: { type: "number" },
        },
        required: ["trackerName"],
      },
    },
  },
] as const;

function findTracker(name: string) {
  const q = name.toLowerCase();
  return listTrackers().find(
    (t) => t.name.toLowerCase() === q || t.name.toLowerCase().includes(q),
  );
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  memberId: string,
) {
  switch (name) {
    case "list_due":
      return getTodayBundle();
    case "search_items":
      return listItems({
        q: String(args.q || ""),
        type: args.type as ItemType | undefined,
        status: "open",
      }).slice(0, 20);
    case "propose_item":
      return { proposal: args, needsConfirm: true };
    case "create_item":
      return createItem(
        {
          type: args.type as ItemType,
          title: String(args.title),
          notes: args.notes ? String(args.notes) : "",
          dueAt: args.dueAt ? String(args.dueAt) : null,
          amount: args.amount != null ? Number(args.amount) : null,
          locationLabel: args.locationLabel
            ? String(args.locationLabel)
            : null,
          mapsUrl: args.mapsUrl ? String(args.mapsUrl) : null,
          recurrence:
            (args.recurrence as
              | "none"
              | "daily"
              | "weekly"
              | "monthly"
              | "yearly") || "none",
          assignee: (args.assignee as "me" | "partner" | "either") || "either",
        },
        memberId,
      );
    case "complete_item":
      return completeItem(String(args.id), memberId);
    case "append_shopping_line":
      return appendShoppingLine(String(args.text), memberId);
    case "list_tracker_status": {
      return listTrackers().map((t) => {
        if (t.kind === "cycle") {
          return { tracker: t, status: openCycleStatus(t.id) };
        }
        const now = new Date();
        return {
          tracker: t,
          month: monthSummary(t.id, now.getFullYear(), now.getMonth() + 1),
        };
      });
    }
    case "log_cycle_install": {
      const t = findTracker(String(args.trackerName));
      if (!t) return { error: "Tracker not found" };
      return logCycleInstall(
        t.id,
        {
          installedAt: args.installedAt
            ? String(args.installedAt)
            : todayISO(),
          expectedDays: args.expectedDays
            ? Number(args.expectedDays)
            : undefined,
          pricePaid:
            args.pricePaid != null ? Number(args.pricePaid) : undefined,
        },
        memberId,
      );
    }
    case "set_rate_segment": {
      const t = findTracker(String(args.trackerName));
      if (!t) return { error: "Tracker not found" };
      return setRateSegment(
        t.id,
        {
          effectiveFrom: String(args.effectiveFrom),
          quantity: Number(args.quantity),
          unitPrice:
            args.unitPrice != null ? Number(args.unitPrice) : undefined,
        },
        memberId,
      );
    }
    case "tracker_month_summary": {
      const t = findTracker(String(args.trackerName));
      if (!t) return { error: "Tracker not found" };
      const now = new Date();
      const year = args.year ? Number(args.year) : now.getFullYear();
      const month = args.month ? Number(args.month) : now.getMonth() + 1;
      return monthSummary(t.id, year, month);
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

export function resolveApiKey() {
  return (
    process.env.LIFEOPS_API_KEY ||
    process.env.OPENAI_API_KEY ||
    getSetting("llm_api_key") ||
    ""
  );
}

export function resolveBaseUrl() {
  return (
    process.env.LIFEOPS_LLM_BASE_URL ||
    getSetting("llm_base_url") ||
    "https://api.openai.com/v1"
  );
}

export function resolveModel() {
  return (
    process.env.LIFEOPS_LLM_MODEL ||
    getSetting("llm_model") ||
    "gpt-4o-mini"
  );
}

export async function runAssistantChat(
  userText: string,
  memberId: string,
  memberName: string,
  geo?: {
    lat: number;
    lng: number;
    mapsUrl: string;
    locationLabel: string;
  } | null,
) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      error:
        "No AI API key configured. Add LIFEOPS_API_KEY in env or Settings.",
      content: null,
      proposal: null,
    };
  }

  const geoBlock = geo
    ? `Device GPS is available right now:
- lat/lng: ${geo.lat}, ${geo.lng}
- mapsUrl: ${geo.mapsUrl}
- locationLabel: ${geo.locationLabel}
When proposing or creating a place, ALWAYS set mapsUrl to that mapsUrl and locationLabel to that locationLabel (or a short place name + that label). Never invent coordinates.`
    : `No device GPS was provided. For places, still propose title/notes; mapsUrl may be filled later.`;

  const messages: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: `You are Life Ops, a household assistant for a couple sharing one home.
Member speaking: ${memberName}. Today is ${todayISO()}.
Use tools for facts. Never invent bills, places, or quantities.
For new saves prefer propose_item so the user can confirm, unless they clearly said "save it" / "confirm".
Be concise. Currency is INR. Speak practically about gas cylinder, milk liters, school van, parents' medicine.
${geoBlock}`,
    },
    { role: "user", content: userText },
  ];

  const baseUrl = resolveBaseUrl().replace(/\/$/, "");
  const model = resolveModel();
  let proposal: Record<string, unknown> | null = null;
  let finalText = "";

  for (let step = 0; step < 6; step++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false as const,
        error: `LLM error ${res.status}: ${errText.slice(0, 300)}`,
        content: null,
        proposal: null,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          role: string;
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const msg = data.choices?.[0]?.message;
    if (!msg) {
      return {
        ok: false as const,
        error: "Empty LLM response",
        content: null,
        proposal: null,
      };
    }

    if (msg.tool_calls?.length) {
      messages.push(msg);
      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        if (
          (call.function.name === "propose_item" ||
            call.function.name === "create_item") &&
          args.type === "place" &&
          geo
        ) {
          if (!args.mapsUrl) args.mapsUrl = geo.mapsUrl;
          if (!args.locationLabel) args.locationLabel = geo.locationLabel;
        }
        const result = await runTool(call.function.name, args, memberId);
        if (
          call.function.name === "propose_item" &&
          result &&
          typeof result === "object" &&
          "proposal" in (result as object)
        ) {
          proposal = (result as { proposal: Record<string, unknown> }).proposal;
          if (proposal?.type === "place" && geo) {
            if (!proposal.mapsUrl) proposal.mapsUrl = geo.mapsUrl;
            if (!proposal.locationLabel) {
              proposal.locationLabel = geo.locationLabel;
            }
          }
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    finalText = msg.content || "";
    break;
  }

  return {
    ok: true as const,
    error: null,
    content:
      finalText ||
      (proposal
        ? "I drafted something — confirm below to save."
        : "Done."),
    proposal,
  };
}
