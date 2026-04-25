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
import { updateMember, setMemberRole, deleteMember } from "../members";

const mockCreateClient = vi.mocked(createClient);

beforeEach(() => vi.clearAllMocks());

// ─── updateMember ──────────────────────────────────────────────────────────────

describe("updateMember", () => {
  const validFields = { display_name: "Alice", email: "alice@example.com" };

  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await updateMember("member-1", validFields);
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await updateMember("member-1", validFields);
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when display_name is empty", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateMember("member-1", { ...validFields, display_name: "  " });
    expect(result).toEqual({ success: false, error: "Name is required." });
  });

  it("returns error when display_name exceeds 80 characters", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateMember("member-1", { ...validFields, display_name: "a".repeat(81) });
    expect(result).toEqual({ success: false, error: "Name must be 80 characters or fewer." });
  });

  it("returns error when email is empty", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateMember("member-1", { ...validFields, email: "" });
    expect(result).toEqual({ success: false, error: "Email is required." });
  });

  it("returns error when email has no @ sign", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await updateMember("member-1", { ...validFields, email: "notanemail" });
    expect(result).toEqual({ success: false, error: "Invalid email address." });
  });

  it("returns error when email exceeds 254 characters", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const longEmail = "a".repeat(243) + "@example.com"; // 255 chars
    const result = await updateMember("member-1", { ...validFields, email: longEmail });
    expect(result).toEqual({ success: false, error: "Email must be 254 characters or fewer." });
  });

  it("returns success on valid update", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await updateMember("member-1", validFields);
    expect(result).toEqual({ success: true });
  });

  it("returns error when database update fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: { message: "update failed" } },
        ],
      }) as never
    );
    const result = await updateMember("member-1", validFields);
    expect(result).toEqual({ success: false, error: "update failed" });
  });
});

// ─── setMemberRole ─────────────────────────────────────────────────────────────

describe("setMemberRole", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await setMemberRole("member-1", "admin");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await setMemberRole("member-1", "admin");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when admin tries to change their own role", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    // adminUser.id === "admin-1"; try to change own role
    const result = await setMemberRole(adminUser.id, "member");
    expect(result).toEqual({
      success: false,
      error: "You cannot change your own role.",
    });
  });

  it("returns success when promoting a member to admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await setMemberRole("member-2", "admin");
    expect(result).toEqual({ success: true });
  });

  it("returns success when demoting an admin to member", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await setMemberRole("other-admin-2", "member");
    expect(result).toEqual({ success: true });
  });
});

// ─── deleteMember ──────────────────────────────────────────────────────────────

describe("deleteMember", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await deleteMember("member-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await deleteMember("member-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when admin tries to delete themselves", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await deleteMember(adminUser.id);
    expect(result).toEqual({
      success: false,
      error: "You cannot delete yourself.",
    });
  });

  it("returns success when admin deletes another member", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await deleteMember("other-member");
    expect(result).toEqual({ success: true });
  });

  it("returns error when database delete fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: { message: "cannot delete" } },
        ],
      }) as never
    );
    const result = await deleteMember("other-member");
    expect(result).toEqual({ success: false, error: "cannot delete" });
  });
});
