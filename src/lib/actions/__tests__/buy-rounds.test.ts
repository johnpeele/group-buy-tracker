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
import {
  createBuyRound,
  updateBuyRound,
  lockBuyRound,
  updateBuyRoundStatus,
} from "../buy-rounds";

const mockCreateClient = vi.mocked(createClient);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

beforeEach(() => vi.clearAllMocks());

// ─── createBuyRound ────────────────────────────────────────────────────────────

describe("createBuyRound", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null, fromResults: [] }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "25.00", moq: "100" })
    );
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [memberProfile],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "25.00", moq: "100" })
    );
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when variant_id is missing", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ price_per_kit: "25.00", moq: "100" })
    );
    expect(result).toEqual({ success: false, error: "Invalid buy round data." });
  });

  it("returns error when price_per_kit is zero", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "0", moq: "100" })
    );
    expect(result).toEqual({ success: false, error: "Invalid buy round data." });
  });

  it("returns error when price_per_kit is negative", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "-5", moq: "100" })
    );
    expect(result).toEqual({ success: false, error: "Invalid buy round data." });
  });

  it("returns error when notes exceed 1000 characters", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "25", moq: "100", notes: "x".repeat(1001) })
    );
    expect(result).toEqual({ success: false, error: "Notes must be 1000 characters or fewer." });
  });

  it("treats whitespace-only notes as null", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile, { data: { id: "round-1" }, error: null }],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "25", moq: "100", notes: "   " })
    );
    expect(result).toEqual({ success: true, id: "round-1" });
  });

  it("returns success with new round id", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { id: "round-123" }, error: null },
        ],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "25.00", moq: "100" })
    );
    expect(result).toEqual({ success: true, id: "round-123" });
  });

  it("returns error when database insert fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: { message: "unique constraint violation" } },
        ],
      }) as never
    );
    const result = await createBuyRound(
      makeFormData({ variant_id: "v1", price_per_kit: "25.00", moq: "100" })
    );
    expect(result).toEqual({
      success: false,
      error: "unique constraint violation",
    });
  });
});

// ─── updateBuyRound ────────────────────────────────────────────────────────────

describe("updateBuyRound", () => {
  const validFields = { price_per_kit: 25.0, moq: 100, notes: null };

  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await updateBuyRound("round-1", validFields);
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await updateBuyRound("round-1", validFields);
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when price_per_kit is zero", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateBuyRound("round-1", { ...validFields, price_per_kit: 0 });
    expect(result).toEqual({ success: false, error: "Price must be greater than 0." });
  });

  it("returns error when price_per_kit is negative", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateBuyRound("round-1", { ...validFields, price_per_kit: -1 });
    expect(result).toEqual({ success: false, error: "Price must be greater than 0." });
  });

  it("returns error when moq is less than 1", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateBuyRound("round-1", { ...validFields, moq: 0 });
    expect(result).toEqual({ success: false, error: "MOQ must be at least 1." });
  });

  it("returns error when moq is not an integer", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateBuyRound("round-1", { ...validFields, moq: 10.5 });
    expect(result).toEqual({ success: false, error: "MOQ must be at least 1." });
  });

  it("returns error when buy round is not found", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRound("round-1", validFields);
    expect(result).toEqual({ success: false, error: "Buy round not found." });
  });

  it("returns error when buy round status is shipped", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "shipped" }, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRound("round-1", validFields);
    expect(result).toEqual({
      success: false,
      error: "Cannot edit a completed buy round.",
    });
  });

  it("returns error when buy round status is cancelled", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "cancelled" }, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRound("round-1", validFields);
    expect(result).toEqual({
      success: false,
      error: "Cannot edit a completed buy round.",
    });
  });

  it("returns error when notes exceed 1000 characters", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile, { data: { status: "open" }, error: null }],
      }) as never
    );
    const result = await updateBuyRound("round-1", { ...validFields, notes: "x".repeat(1001) });
    expect(result).toEqual({ success: false, error: "Notes must be 1000 characters or fewer." });
  });

  it("returns success for an open buy round", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "open" }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRound("round-1", validFields);
    expect(result).toEqual({ success: true });
  });
});

// ─── lockBuyRound ──────────────────────────────────────────────────────────────

describe("lockBuyRound", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when buy round is not found (rpc returns null)", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile],
        rpcResult: { data: null, error: null },
      }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({ success: false, error: "Buy round not found." });
  });

  it("returns error when buy round is already locked", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile],
        rpcResult: {
          data: { status: "locked", committed_kits: 100, moq: 100 },
          error: null,
        },
      }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({
      success: false,
      error: "Buy round is already locked.",
    });
  });

  it("returns error when MOQ is not met", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [adminProfile],
        rpcResult: {
          data: { status: "open", committed_kits: 50, moq: 100 },
          error: null,
        },
      }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({
      success: false,
      error: "MOQ not met — 50/100 kits committed.",
    });
  });

  it("returns success when MOQ is met", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
        rpcResult: {
          data: { status: "open", committed_kits: 100, moq: 100 },
          error: null,
        },
      }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({ success: true });
  });

  it("returns success when committed kits exceed MOQ", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
        rpcResult: {
          data: { status: "open", committed_kits: 150, moq: 100 },
          error: null,
        },
      }) as never
    );
    const result = await lockBuyRound("round-1");
    expect(result).toEqual({ success: true });
  });
});

// ─── updateBuyRoundStatus ──────────────────────────────────────────────────────

describe("updateBuyRoundStatus", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "cancelled");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when buy round is not found", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "cancelled");
    expect(result).toEqual({ success: false, error: "Buy round not found." });
  });

  it("rejects invalid transition: open → submitted", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "open" }, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "submitted");
    expect(result).toEqual({
      success: false,
      error: "Cannot transition from open to submitted.",
    });
  });

  it("rejects invalid transition: open → shipped", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "open" }, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "shipped");
    expect(result).toEqual({
      success: false,
      error: "Cannot transition from open to shipped.",
    });
  });

  it("rejects invalid transition: submitted → shipped when already shipped", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "shipped" }, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "cancelled");
    expect(result).toEqual({
      success: false,
      error: "Cannot transition from shipped to cancelled.",
    });
  });

  it("transitions locked → submitted", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "locked" }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "submitted");
    expect(result).toEqual({ success: true });
  });

  it("transitions submitted → shipped", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "submitted" }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "shipped");
    expect(result).toEqual({ success: true });
  });

  it("transitions open → cancelled", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "open" }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "cancelled");
    expect(result).toEqual({ success: true });
  });

  it("transitions locked → cancelled", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { status: "locked" }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateBuyRoundStatus("round-1", "cancelled");
    expect(result).toEqual({ success: true });
  });
});
