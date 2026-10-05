import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/workspace",
}));

vi.mock("@/lib/auth-client", () => ({
  signIn: { email: vi.fn() },
  signOut: vi.fn(),
  useSession: () => ({ data: null }),
}));

import { LogoutButton } from "./logout-button";
import { Sidebar } from "./layout/sidebar";

describe("Sidebar counsellor identity", () => {
  it("shows the signed-in counsellor with logout", () => {
    render(<Sidebar user={{ name: "Dylan Example", email: "dylan@example.com" }} />);
    expect(screen.getByText("Dylan Example")).toBeDefined();
    expect(screen.getByText("dylan@example.com")).toBeDefined();
    expect(screen.getByText("Logout")).toBeDefined();
  });

  it("shows sign-in when logged out", () => {
    render(<Sidebar user={null} />);
    expect(screen.getByText("Sign in")).toBeDefined();
    expect(screen.queryByText("Logout")).toBeNull();
  });

  it("logs out on click", async () => {
    const { signOut } = await import("@/lib/auth-client");
    render(<Sidebar user={{ name: "Dylan Example", email: "dylan@example.com" }} />);
    fireEvent.click(screen.getByText("Logout"));
    expect(signOut).toHaveBeenCalled();
  });
});

describe("LogoutButton", () => {
  it("renders", () => {
    render(<LogoutButton />);
    expect(screen.getByText("Logout")).toBeDefined();
  });
});
