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

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendInvite, resendInvite, acceptInvite } from "../invites";

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default admin client with working email send
  mockCreateAdminClient.mockResolvedValue(
    createMockClient({ user: adminUser }) as never
  );
});

// ─── sendInvite ────────────────────────────────────────────────────────────────

describe("sendInvite", () => {
  it("returns error when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: null }) as never
    );
    const result = await sendInvite(makeFormData({ email: "new@example.com" }));
    expect(result).toEqual({ success: false, error: "Not authenticated." });
  });

  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await sendInvite(makeFormData({ email: "new@example.com" }));
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error for email without @", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await sendInvite(makeFormData({ email: "notanemail" }));
    expect(result).toEqual({ success: false, error: "Invalid email address." });
  });

  it("returns error for empty email", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: adminUser, fromResults: [adminProfile] }) as never
    );
    const result = await sendInvite(makeFormData({ email: "" }));
    expect(result).toEqual({ success: false, error: "Invalid email address." });
  });

  it("returns error when email is already a member", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: { id: "existing-user" }, error: null },
        ],
      }) as never
    );
    const result = await sendInvite(makeFormData({ email: "existing@example.com" }));
    expect(result).toEqual({
      success: false,
      error: "That email is already a member.",
    });
  });

  it("cleans up invite row when email sending fails", async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
    });

    const fromMock = vi.fn()
      .mockReturnValueOnce({ // profiles select (admin check)
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
        then: (res: (v: unknown) => unknown) => res({ data: { role: "admin" }, error: null }),
      })
      .mockReturnValueOnce({ // profiles select (existing check)
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
      })
      .mockReturnValueOnce({ // pending_invites insert
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { token: "tok-abc" }, error: null }),
        then: (res: (v: unknown) => unknown) => res({ data: { token: "tok-abc" }, error: null }),
      })
      .mockReturnValue({ // pending_invites delete (cleanup)
        delete: deleteMock,
        then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
      });

    const adminClientMock = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            error: { message: "Email service unavailable" },
          }),
        },
      },
      from: vi.fn().mockReturnValue({
        delete: deleteMock,
      }),
    };

    mockCreateClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: adminUser } }) }, from: fromMock } as never);
    mockCreateAdminClient.mockResolvedValue(adminClientMock as never);

    const result = await sendInvite(makeFormData({ email: "fail@example.com" }));
    expect(result).toEqual({
      success: false,
      error: "Failed to send invite email: Email service unavailable",
    });
  });

  it("returns success when invite is sent", async () => {
    const adminClientWithWorkingEmail = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null }, // no existing member
          { data: { token: "tok-xyz" }, error: null }, // invite created
        ],
      }) as never
    );
    mockCreateAdminClient.mockResolvedValue(adminClientWithWorkingEmail as never);

    const result = await sendInvite(makeFormData({ email: "newmember@example.com" }));
    expect(result).toEqual({ success: true });
  });
});

// ─── resendInvite ──────────────────────────────────────────────────────────────

describe("resendInvite", () => {
  it("returns error when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({ user: memberUser, fromResults: [memberProfile] }) as never
    );
    const result = await resendInvite("invite-1");
    expect(result).toEqual({ success: false, error: "Admin access required." });
  });

  it("returns error when invite is not found", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: adminUser,
        fromResults: [
          adminProfile,
          { data: null, error: null },
        ],
      }) as never
    );
    const result = await resendInvite("invite-404");
    expect(result).toEqual({ success: false, error: "Invite not found." });
  });
});

// ─── acceptInvite ──────────────────────────────────────────────────────────────

describe("acceptInvite", () => {
  it("returns error when token is empty", async () => {
    const result = await acceptInvite("", "Alice");
    expect(result).toEqual({ success: false, error: "Please provide your name." });
  });

  it("returns error when display_name is blank", async () => {
    const result = await acceptInvite("valid-token", "  ");
    expect(result).toEqual({ success: false, error: "Please provide your name." });
  });

  it("returns error for an invalid or expired token", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: null,
        rpcResult: { data: { valid: false }, error: null },
      }) as never
    );
    const result = await acceptInvite("bad-token", "Alice");
    expect(result).toEqual({
      success: false,
      error: "This invite link is invalid or has expired. Ask your coordinator to resend it.",
    });
  });

  it("returns error when magic link generation fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: null,
        rpcResult: { data: { valid: true, email: "alice@example.com" }, error: null },
        fromResults: [{ data: { error: null }, error: null }],
      }) as never
    );
    mockCreateAdminClient.mockResolvedValue({
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "link gen failed" },
          }),
        },
      },
    } as never);

    const result = await acceptInvite("good-token", "Alice");
    expect(result).toEqual({
      success: false,
      error: "Account created but sign-in link failed. Try signing in with a magic link.",
    });
  });

  it("returns success with actionLink on valid invite", async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        user: null,
        rpcResult: { data: { valid: true, email: "alice@example.com" }, error: null },
        fromResults: [{ data: { error: null }, error: null }],
      }) as never
    );
    mockCreateAdminClient.mockResolvedValue({
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: { properties: { action_link: "https://example.com/magic-link" } },
            error: null,
          }),
        },
      },
    } as never);

    const result = await acceptInvite("good-token", "Alice");
    expect(result).toEqual({
      success: true,
      actionLink: "https://example.com/magic-link",
    });
  });
});
