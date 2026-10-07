import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "./page";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("next/font/google", () => ({
  Instrument_Serif: () => ({ className: "serif-mock" }),
}));

describe("LandingPage", () => {
  it("sends counsellors to sign in", () => {
    render(<LandingPage />);
    const signIn = screen.getByRole("link", { name: "Sign in as counsellor" });
    expect(signIn.getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Open workspace" }).getAttribute("href")).toBe(
      "/workspace"
    );
    expect(screen.getByText("Explainable Match")).toBeDefined();
    expect(screen.getByText("Next Best Question")).toBeDefined();
    expect(screen.getByText("What-if Explorer")).toBeDefined();
  });
});
