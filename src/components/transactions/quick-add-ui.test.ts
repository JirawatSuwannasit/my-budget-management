import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsPage = readFileSync("src/app/(private)/settings/page.tsx", "utf8");
const transactionsPage = readFileSync("src/app/(private)/transactions/page.tsx", "utf8");
const manager = readFileSync("src/components/transactions/quick-transaction-templates.tsx", "utf8");
const shortcuts = readFileSync("src/components/transactions/quick-add-list.tsx", "utf8");
const normalForm = readFileSync("src/components/transactions/transaction-form.tsx", "utf8");

describe("simplified Quick Add placement and controls", () => {
  it("removes Quick Add configuration from Settings", () => expect(settingsPage).not.toContain("QuickTransactionTemplates"));
  it("renders collapsed settings before always-visible shortcuts on Transactions", () => {
    expect(transactionsPage).toContain("<QuickTransactionTemplates");
    expect(transactionsPage.indexOf("<QuickTransactionTemplates")).toBeLessThan(transactionsPage.indexOf("<QuickAddList"));
    expect(manager).toContain("<LazyDetails");
    expect(shortcuts).toContain("overflow-x-auto");
  });
  it("keeps the template form compact", () => {
    expect(manager).not.toContain('name="sort_order"');
    expect(manager).not.toContain('name="notes"');
    expect(manager).not.toContain('name="related_entity_id"');
    expect(manager).not.toContain('value="credit_card_expense"');
  });
  it("keeps normal credit-card transactions available", () => {
    expect(normalForm).toContain('"credit_card_expense"');
    expect(normalForm).toContain('name="credit_card_id"');
  });
});
