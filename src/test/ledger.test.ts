import { describe, expect, it } from "vitest";
import { advance, sampleOrders, split, totals } from "@/lib/ledger";
describe("Ledger rules", () => {
  it("pays the seller 90% of KES 1,100", () => expect(split(1100).seller).toBe(990));
  it("collects 10% of KES 1,100 for hub upkeep", () => expect(split(1100).hub).toBe(110));
  it("keeps paid and quality-check orders in escrow", () => expect(totals(sampleOrders).held).toBe(2300));
  it("counts only released seller payouts", () => expect(totals(sampleOrders).released).toBe(162));
  it("collects hub upkeep only on release", () => expect(totals(sampleOrders).upkeep).toBe(18));
  it("requires payment then quality check before release", () => {
    const order = sampleOrders[3]; if (!order) throw new Error("Sample order missing");
    const paid = advance(order, "2026-11-25T10:00:00Z"); expect(paid.status).toBe("escrow");
    expect(paid.paidAt).toBe("2026-11-25T10:00:00Z");
    const checked = advance(paid, "2026-11-25T10:01:00Z"); expect(checked.status).toBe("quality");
    const released = advance(checked, "2026-11-25T10:02:00Z"); expect(released.status).toBe("released"); expect(released.releasedAt).toBe("2026-11-25T10:02:00Z");
    expect(advance(released, "later")).toEqual(released);
  });
});