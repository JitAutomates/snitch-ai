import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";

const mocks = vi.hoisted(() => ({ premium: false, navigate: vi.fn(), getSession: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ clear: vi.fn(), cancelQueries: vi.fn() }) }));
vi.mock("@/hooks/use-plan", () => ({ usePlan: () => ({ premium: mocks.premium, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } } }), getSession: mocks.getSession },
  from: () => {
    const row = { id: "22222222-2222-4222-8222-222222222222", user_id: "11111111-1111-4111-8111-111111111111", day: new Date().toISOString().slice(0, 10), title: "Saved daily brief", body: "Collected updates", action_plan: "Review updates", highlights: [], pinned: false, model: "test", created_at: new Date().toISOString() };
    const chain = { select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain, order: () => chain, limit: async () => ({ data: [row], error: null }) };
    return chain;
  },
} }));
import { Route } from "@/routes/_authenticated/briefs";
const Briefs = (Route as unknown as { component: ComponentType }).component;
beforeEach(() => { vi.clearAllMocks(); mocks.premium = false; mocks.getSession.mockResolvedValue({ data: { session: null } }); });
afterEach(cleanup);

describe("Brief plan interactions", () => {
  it("prevents Free regeneration and sends locked history to Billing", async () => {
    render(<Briefs />);
    fireEvent.click(await screen.findByRole("button", { name: "Regenerate" }));
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "View plans to unlock brief history" })).toHaveAttribute("href", "/billing");
  });
  it("allows Premium regeneration and history access", async () => {
    mocks.premium = true;
    render(<Briefs />);
    fireEvent.click(await screen.findByRole("button", { name: "Regenerate" }));
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "View plans to unlock brief history" })).toBeNull();
  });
});