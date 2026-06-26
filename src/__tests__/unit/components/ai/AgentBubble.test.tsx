import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentContextProvider } from "@/components/ai/AgentContextProvider";
import { AgentBubble } from "@/components/ai/AgentBubble";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/dashboard",
}));

// Mock AuthContext used by AgentContextProvider
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({
    user: { id: "test-user-id" },
    adminRole: "admin",
  }),
}));

// Mock useBranch hook
vi.mock("@/hooks/useBranch", () => ({
  useBranch: () => ({
    currentBranchId: "branch-1",
    currentBranchName: "Sucursal Centro",
  }),
}));

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

function renderWithProvider() {
  return render(
    <AgentContextProvider>
      <AgentBubble />
    </AgentContextProvider>,
  );
}

describe("AgentBubble state machine", () => {
  it("starts in collapsed state (floating button visible)", () => {
    renderWithProvider();
    expect(screen.getByLabelText("Abrir agente")).toBeInTheDocument();
  });

  it("transitions to repose on click", () => {
    renderWithProvider();
    fireEvent.click(screen.getByLabelText("Abrir agente"));

    expect(screen.getByText(/Agente Opttius/)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Haz una pregunta o selecciona una opción...",
      ),
    ).toBeInTheDocument();
  });

  it("transitions to conversation when user sends a message", () => {
    renderWithProvider();
    fireEvent.click(screen.getByLabelText("Abrir agente"));

    const input = screen.getByPlaceholderText(
      "Haz una pregunta o selecciona una opción...",
    );
    fireEvent.change(input, { target: { value: "Hola" } });
    fireEvent.click(screen.getByLabelText("Enviar mensaje"));

    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Escribe un mensaje..."),
    ).toBeInTheDocument();
  });

  it("transitions back to collapsed on close", () => {
    renderWithProvider();
    fireEvent.click(screen.getByLabelText("Abrir agente"));
    fireEvent.click(screen.getByLabelText("Cerrar agente"));
    expect(screen.getByLabelText("Abrir agente")).toBeInTheDocument();
  });

  it("shows badge when notification state has count", () => {
    renderWithProvider();
    // Collapsed should have badge with count 0 (hidden via opacity-0)
    const badge = screen.getByText("0");
    expect(badge.className).toContain("opacity-0");
  });
});
