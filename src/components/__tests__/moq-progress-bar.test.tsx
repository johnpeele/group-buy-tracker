import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MoqProgressBar, MoqProgressBarSkeleton } from "../moq-progress-bar";

const mockConfetti = vi.fn();

vi.mock("canvas-confetti", () => ({ default: mockConfetti }));

beforeEach(() => {
  mockConfetti.mockClear();
  sessionStorage.clear();
});

describe("MoqProgressBar", () => {
  it("shows kit count and percentage when MOQ is not met", () => {
    render(<MoqProgressBar committedKits={50} moq={100} buyRoundId="r1" />);
    expect(screen.getByText("50 of 100 kits")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows MOQ Met text when committed equals MOQ", () => {
    render(<MoqProgressBar committedKits={100} moq={100} buyRoundId="r1" />);
    expect(screen.getByText("MOQ Met! 🎉")).toBeInTheDocument();
  });

  it("shows MOQ Met text when committed exceeds MOQ", () => {
    render(<MoqProgressBar committedKits={120} moq={100} buyRoundId="r1" />);
    expect(screen.getByText("MOQ Met! 🎉")).toBeInTheDocument();
  });

  it("shows over-MOQ count when committed exceeds MOQ", () => {
    render(<MoqProgressBar committedKits={130} moq={100} buyRoundId="r1" />);
    expect(screen.getByText("+30 above MOQ")).toBeInTheDocument();
  });

  it("does not show over-MOQ label when exactly at MOQ", () => {
    render(<MoqProgressBar committedKits={100} moq={100} buyRoundId="r1" />);
    expect(screen.queryByText(/above MOQ/)).not.toBeInTheDocument();
  });

  it("does not show over-MOQ label when below MOQ", () => {
    render(<MoqProgressBar committedKits={50} moq={100} buyRoundId="r1" />);
    expect(screen.queryByText(/above MOQ/)).not.toBeInTheDocument();
  });

  it("caps percentage display at 100% when over MOQ", () => {
    render(<MoqProgressBar committedKits={150} moq={100} buyRoundId="r1" />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("rounds the percentage to the nearest integer", () => {
    // 33 / 100 = 33%
    render(<MoqProgressBar committedKits={33} moq={100} buyRoundId="r1" />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("sets correct aria attributes on the progress track", () => {
    render(<MoqProgressBar committedKits={40} moq={200} buyRoundId="r1" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "200");
    expect(bar).toHaveAttribute("aria-label", "40 of 200 kits committed");
  });

  it("does not fire confetti when MOQ is not met", async () => {
    render(<MoqProgressBar committedKits={50} moq={100} buyRoundId="r1" />);
    // Wait a tick to let any effects settle
    await waitFor(() => expect(mockConfetti).not.toHaveBeenCalled());
  });

  it("fires confetti when MOQ is first reached", async () => {
    render(<MoqProgressBar committedKits={100} moq={100} buyRoundId="r1" />);
    await waitFor(() => expect(mockConfetti).toHaveBeenCalledOnce());
  });

  it("does not fire confetti again for the same round in the same session", async () => {
    sessionStorage.setItem("confetti_shown_r1", "1");
    render(<MoqProgressBar committedKits={100} moq={100} buyRoundId="r1" />);
    // Allow time for any effects
    await new Promise((r) => setTimeout(r, 50));
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it("fires confetti for different buy round IDs independently", async () => {
    sessionStorage.setItem("confetti_shown_r1", "1");
    render(<MoqProgressBar committedKits={100} moq={100} buyRoundId="r2" />);
    await waitFor(() => expect(mockConfetti).toHaveBeenCalledOnce());
  });
});

describe("MoqProgressBarSkeleton", () => {
  it("renders without errors", () => {
    const { container } = render(<MoqProgressBarSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
