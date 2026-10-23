import { NextResponse } from "next/server";
import { FILTERS, SEED, filterMessages, type Filter } from "@/lib/contact-forms";

// Stateless JSON-RPC MCP endpoint over the sample inbox the page starts with. Messages placed in a browser stay in
// that browser's localStorage, so this route never sees them, and it sends no email.

type RpcRequest = { id?: number | string | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };

const TOOLS = [
  {
    name: "list_messages",
    description: "List the sample inbox messages, optionally only New or Read",
    inputSchema: { type: "object", properties: { state: { type: "string", enum: FILTERS } } },
  },
  {
    name: "get_message",
    description: "Get one sample message by id",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
];

class RpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

function callTool(name: string | undefined, args: Record<string, unknown> = {}) {
  switch (name) {
    case "list_messages": {
      const state = args.state ?? "All";
      if (!(FILTERS as unknown[]).includes(state)) throw new RpcError(-32602, `Unknown state: ${String(state)}`);
      return { messages: filterMessages(SEED, state as Filter) };
    }
    case "get_message": {
      const message = SEED.find((entry) => entry.id === args.id);
      if (!message) throw new RpcError(-32602, `No message with id ${String(args.id)}`);
      return { message };
    }
    default:
      throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
  }
}

export async function POST(request: Request) {
  let id: RpcRequest["id"] = null;
  try {
    const body = (await request.json()) as RpcRequest;
    id = body.id ?? null;
    let result: unknown;
    switch (body.method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "Contact Forms Inbox", version: "1.0.0" },
        };
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call":
        result = callTool(body.params?.name, body.params?.arguments);
        break;
      default:
        throw new RpcError(-32601, `Unknown method: ${String(body.method)}`);
    }
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (error) {
    const code = error instanceof RpcError ? error.code : -32700;
    const message = error instanceof RpcError ? error.message : "Parse error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });
  }
}
