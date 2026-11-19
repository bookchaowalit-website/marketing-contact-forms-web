import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page on the App shell", () => {
  const html = renderToString(<Home />);

  it("renders the example message, its New pill, date and the no-email notice", () => {
    expect(html).toContain('class="as"');
    expect(html).toContain("Mina Park · A question about the work");
    expect(html).toMatch(/data-tone="amber"[^>]*>New</);
    expect(html).toContain("1 Oct 2026");
    expect(html).toContain("Example message");
    expect(html).toContain("No email is sent");
    expect(html).not.toMatch(/INBOX \/ INTAKE|contract-mark/);
  });

  it("shows the inbox lists with counts, New message as the one filled button and the hub footer", () => {
    expect(html).toMatch(/aria-current="true"[^>]*><span>All messages<\/span><span class="as-count">1<\/span>/);
    expect(html).toMatch(/Read<\/span><span class="as-count">0<\/span>/);
    expect(html.match(/class="as-button"/g)).toHaveLength(1);
    expect(html).toContain('href="https://bookchaowalit.com/"');
  });
});
