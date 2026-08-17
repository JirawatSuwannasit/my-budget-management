import { describe, expect, it } from "vitest";
import { resolveQuickAmount } from "./quick-templates";

describe("quick transaction templates", () => {
  it("uses a positive fixed amount for one tap", () => expect(resolveQuickAmount({ active: true, amount: 45 }, null)).toBe(45));
  it("requires entered amount for quick fill", () => expect(() => resolveQuickAmount({ active: true, amount: null }, null)).toThrow("QUICK_AMOUNT_REQUIRED"));
  it("uses an entered amount for quick fill", () => expect(resolveQuickAmount({ active: true, amount: null }, "80")).toBe(80));
  it("does not execute a disabled template", () => expect(() => resolveQuickAmount({ active: false, amount: 45 }, null)).toThrow("QUICK_TEMPLATE_INACTIVE"));
});
