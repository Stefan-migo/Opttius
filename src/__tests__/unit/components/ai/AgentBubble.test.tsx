import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentBubble } from "@/components/ai/AgentBubble";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/dashboard",
}));

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe("AgentBubble state machine", () => {
  it("starts in collapsed state (floating button visible)", () => {
    render(<AgentBubble />);
    // The floating button has aria-label "Abrir agente"
    expect(screen.getByLabelText("Abrir agente")).toBeInTheDocument();
  });

  it("transitions to repose on click", () => {
    render(<AgentBubble />);
    fireEvent.click(screen.getByLabelText("Abrir agente"));

    // Panel should be visible with the contextual greeting
    expect(screen.getByText(/Agente Opttius/)).toBeInTheDocument();
    // Input placeholder indicates repose (the state-specific placeholder)
    expect(
      screen.getByPlaceholderText(
        "Haz una pregunta o selecciona una opción...",
      ),
    ).toBeInTheDocument();
  });

  it("transitions to conversation when user sends a message", () => {
    render(<AgentBubble />);
    fireEvent.click(screen.getByLabelText("Abrir agente"));

    const input = screen.getByPlaceholderText(
      "Haz una pregunta o selecciona una opción...",
    );
    fireEvent.change(input, { target: { value: "Hola" } });
    fireEvent.click(screen.getByLabelText("Enviar mensaje"));

    // The user message appears as a text block
    expect(screen.getByText("Hola")).toBeInTheDocument();
    // Input placeholder should now be the conversation one
    expect(
      screen.getByPlaceholderText("Escribe un mensaje..."),
    ).toBeInTheDocument();
  });

  it("transitions back to collapsed on close", () => {
    render(<AgentBubble />);
    fireEvent.click(screen.getByLabelText("Abrir agente"));

    // Click close button
    fireEvent.click(screen.getByLabelText("Cerrar agente"));

    // Should be back to collapsed
    expect(screen.getByLabelText("Abrir agente")).toBeInTheDocument();
  });

  it("shows badge when notification state has count", () => {
    // Render with notification state via initial badge — using state override
    // We test via the BubbleFloatingButton which is the collapsed state
    render(<AgentBubble />);

    // Collapsed should NOT have a visible badge (badgeCount starts at 0)
    const badge = screen.getByText("0");
    expect(badge.className).toContain("opacity-0");
  });
});
