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
import { createOrUpdateCommitment, deleteCommitment } from "../commitments";

const mockCreateClient = vi.mocked(createClient);

beforeEach(() => vi.clearAllMocks());

// ─── createOrUpdateCommitment ──────────────────────────────────────────────────

describe("createOrUpdateCommitment", () => {
  it("returns error when kit_quantity is less than 10", async () => {
    const result = await createOrUpdateCommitment("round-1", 9);
    expect(result).toEqual({
      success: false,
      error: "Kit quantity must be at least 10.",
    });
  });

  it("returns error when kit_quantity is 0", async () => {
    const result = await createOrUpdateCommitment("round-1", 0);
    expect(result).toEqual({
      success: false,
      error: "Kit quantity must be at least 10.",
    });
  });

  it("returns error when kit_quantity is not an integer", async () => {
    const result = await createOrUpdateCommitment("round-1", 10.5);
    expect(result).toEqual({
      success: false,
      error: "Kit quantity must be at least 10.",
    });
  });

  it("returns error when kit_quantity exceeds 10,000", async () => {
    const result = await createOrUpdateCommitment("round-1", 10_001);
    expect(result).toEqual({
      success: false,
      error: "Kit quantity cannot exceed 10,000.",
    });
  });

  it("accepts exactly 10,000 kits (upper boundary)", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [
          { data: { id: "round-1", status: "open", moq: 100 }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 10_000);
    expect(result).toEqual({ success: true, kit_quantity: 10_000 });
  });

  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 10);
    expect(result).toEqual({ success: false, error: "Not authenticated." });
  });

  it("returns error when buy round is not found", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [{ data: null, error: { message: "not found" } }],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 10);
    expect(result).toEqual({ success: false, error: "Buy round not found." });
  });

  it("returns error when buy round is not open", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [{ data: { id: "round-1", status: "locked", moq: 100 }, error: null }],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 10);
    expect(result).toEqual({
      success: false,
      error: "This buy round is locked — commitments are no longer editable.",
    });
  });

  it("returns error when buy round is shipped", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [{ data: { id: "round-1", status: "shipped", moq: 100 }, error: null }],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 20);
    expect(result).toEqual({
      success: false,
      error: "This buy round is shipped — commitments are no longer editable.",
    });
  });

  it("returns success with kit_quantity on valid commit", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [
          { data: { id: "round-1", status: "open", moq: 100 }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 25);
    expect(result).toEqual({ success: true, kit_quantity: 25 });
  });

  it("accepts exactly 10 kits (boundary)", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [
          { data: { id: "round-1", status: "open", moq: 100 }, error: null },
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 10);
    expect(result).toEqual({ success: true, kit_quantity: 10 });
  });

  it("returns error when upsert fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [
          { data: { id: "round-1", status: "open", moq: 100 }, error: null },
          { data: null, error: { message: "db error" } },
        ],
      }) as never
    );
    const result = await createOrUpdateCommitment("round-1", 10);
    expect(result).toEqual({
      success: false,
      error: "Failed to save commitment. Please try again.",
    });
  });
});

// ─── deleteCommitment ──────────────────────────────────────────────────────────

describe("deleteCommitment", () => {
  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: memberUser,
        fromResults: [memberProfile],
      }) as never
    );
    const result = await deleteCommitment("commitment-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns success when admin deletes a commitment", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await deleteCommitment("commitment-1");
    expect(result).toEqual({ success: true });
  });

  it("returns error when database delete fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: { message: "foreign key violation" } },
        ],
      }) as never
    );
    const result = await deleteCommitment("commitment-1");
    expect(result).toEqual({
      success: false,
      error: "foreign key violation",
    });
  });
});
