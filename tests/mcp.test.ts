import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id and lists the real tools", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" })).json();
    expect(body.id).toBe(7);
    expect(body.result.tools.map((t: { name: string }) => t.name)).toEqual(["list_messages", "get_message"]);
  });

  it("list_messages filters the sample inbox by state", async () => {
    const all = await (await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_messages" } })).json();
    expect(all.result.messages.map((m: { id: string }) => m.id)).toEqual(["seed"]);
    const read = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_messages", arguments: { state: "Read" } } })).json();
    expect(read.result.messages).toEqual([]);
  });

  it("get_message returns the sample letter and errors on an unknown id", async () => {
    const ok = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_message", arguments: { id: "seed" } } })).json();
    expect(ok.result.message.name).toBe("Mina Park");
    const res = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_message", arguments: { id: "nope" } } });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe(-32602);
    expect(body.id).toBe(4);
  });

  it("rejects a bad state, an unknown tool, an unknown method and a malformed body", async () => {
    expect((await (await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_messages", arguments: { state: "Spam" } } })).json()).error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "send_email" } })).json()).error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 8, method: "nope" })).json()).error.code).toBe(-32601);
    const bad = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect((await bad.json()).error.code).toBe(-32700);
  });
});
