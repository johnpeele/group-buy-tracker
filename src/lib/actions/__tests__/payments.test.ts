import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockClient,
  adminUser,
  memberUser,
  adminProfile,
  memberProfile,
} from "@/test/mock-supabase";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { markPaymentReceived, removePayment } from "../payments";

const mockCreateClient = vi.mocked(createClient);

beforeEach(() => vi.clearAllMocks());

// ─── markPaymentReceived ───────────────────────────────────────────────────────

describe("markPaymentReceived", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await markPaymentReceived("commitment-1", 50);
    expect(result).toEqual({ success: false, error: "Not authenticated." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await markPaymentReceived("commitment-1", 50);
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when amount_paid is zero", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await markPaymentReceived("commitment-1", 0);
    expect(result).toEqual({ success: false, error: "Invalid payment amount." });
  });

  it("returns error when amount_paid is negative", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await markPaymentReceived("commitment-1", -10);
    expect(result).toEqual({ success: false, error: "Invalid payment amount." });
  });

  it("returns error when amount_paid exceeds $100,000", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await markPaymentReceived("commitment-1", 100_001);
    expect(result).toEqual({ success: false, error: "Payment amount cannot exceed $100,000." });
  });

  it("returns error when notes exceed 1000 characters", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await markPaymentReceived("commitment-1", 50, "x".repeat(1001));
    expect(result).toEqual({ success: false, error: "Notes must be 1000 characters or fewer." });
  });

  it("returns error when commitment is not found", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await markPaymentReceived("commitment-1", 50);
    expect(result).toEqual({ success: false, error: "Commitment not found." });
  });

  it("returns success on valid payment", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { id: "commitment-1", buy_round_id: "round-1" }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await markPaymentReceived("commitment-1", 250, "cash");
    expect(result).toEqual({ success: true });
  });

  it("returns error when payment insert fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { id: "commitment-1", buy_round_id: "round-1" }, error: null },
          { data: null, error: { message: "insert failed" } },
        ],
      }) as never
    );
    const result = await markPaymentReceived("commitment-1", 50);
    expect(result).toEqual({ success: false, error: "insert failed" });
  });
});

// ─── removePayment ─────────────────────────────────────────────────────────────

describe("removePayment", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await removePayment("payment-1");
    expect(result).toEqual({ success: false, error: "Not authenticated." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await removePayment("payment-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns success when admin removes a payment", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await removePayment("payment-1");
    expect(result).toEqual({ success: true });
  });

  it("returns error when database delete fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: { message: "delete failed" } },
        ],
      }) as never
    );
    const result = await removePayment("payment-1");
    expect(result).toEqual({ success: false, error: "delete failed" });
  });
});
