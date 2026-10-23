import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the compose form, the sample letter and the no-email notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Make the first reply easier.");
    expect(html).toContain("Place in local inbox");
    expect(html).toContain("Mina Park");
    expect(html).toContain("01 Oct");
    expect(html).toContain("<strong>1<!-- --> <!-- -->message</strong>");
    expect(html).toContain("No email is sent. This is a browser-only prototype");
  });
});
