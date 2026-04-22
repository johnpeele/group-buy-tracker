import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns a single class name unchanged", () => {
    expect(cn("text-sm")).toBe("text-sm");
  });

  it("joins multiple class names", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("ignores falsy values", () => {
    expect(cn("text-sm", undefined, null, false, "font-bold")).toBe(
      "text-sm font-bold"
    );
  });

  it("resolves Tailwind conflicts — later class wins", () => {
    // tailwind-merge should pick text-lg over text-sm
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("resolves conflicting padding classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles conditional class objects", () => {
    expect(cn({ "bg-red-500": true, "bg-blue-500": false })).toBe("bg-red-500");
  });

  it("returns empty string when no classes are provided", () => {
    expect(cn()).toBe("");
  });
});
