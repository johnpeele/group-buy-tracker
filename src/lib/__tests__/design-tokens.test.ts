import { describe, it, expect } from "vitest";
import { statusBadge, tokens } from "../design-tokens";

describe("statusBadge", () => {
  it("returns the correct classes for 'open'", () => {
    expect(statusBadge("open")).toBe(tokens.status.open);
  });

  it("returns the correct classes for 'locked'", () => {
    expect(statusBadge("locked")).toBe(tokens.status.locked);
  });

  it("returns the correct classes for 'submitted'", () => {
    expect(statusBadge("submitted")).toBe(tokens.status.submitted);
  });

  it("returns the correct classes for 'shipped'", () => {
    expect(statusBadge("shipped")).toBe(tokens.status.shipped);
  });

  it("returns the correct classes for 'cancelled'", () => {
    expect(statusBadge("cancelled")).toBe(tokens.status.cancelled);
  });

  it("returns the correct classes for 'paid'", () => {
    expect(statusBadge("paid")).toBe(tokens.status.paid);
  });

  it("returns the correct classes for 'awaiting'", () => {
    expect(statusBadge("awaiting")).toBe(tokens.status.awaiting);
  });

  it("falls back to 'awaiting' classes for an unknown status", () => {
    expect(statusBadge("unknown_status")).toBe(tokens.status.awaiting);
  });

  it("falls back to 'awaiting' classes for an empty string", () => {
    expect(statusBadge("")).toBe(tokens.status.awaiting);
  });
});
