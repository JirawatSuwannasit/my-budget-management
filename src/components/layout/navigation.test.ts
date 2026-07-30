import { describe, expect, it } from "vitest";
import { getNavigationItems } from "./navigation";

describe("mobile navigation configuration", () => {
  it("keeps all nine routes in desktop order", () => {
    expect(getNavigationItems("en").map((item) => item.href)).toEqual([
      "/dashboard", "/accounts", "/transactions", "/planning", "/categories",
      "/debts-cards", "/upcoming", "/reports", "/settings"
    ]);
  });

  it("selects the four routed mobile primaries in the approved order", () => {
    expect(getNavigationItems("en").filter((item) => item.mobilePrimary).map((item) => item.href)).toEqual([
      "/dashboard", "/transactions", "/planning", "/upcoming"
    ]);
  });

  it("puts exactly the five approved destinations in More", () => {
    expect(getNavigationItems("th").filter((item) => !item.mobilePrimary).sort((a, b) => (a.mobileMoreOrder ?? 0) - (b.mobileMoreOrder ?? 0)).map((item) => item.href)).toEqual([
      "/accounts", "/debts-cards", "/categories", "/reports", "/settings"
    ]);
  });
});
