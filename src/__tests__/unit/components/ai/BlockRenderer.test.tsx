import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlockRenderer } from "@/components/ai/blocks/BlockRenderer";

// next/navigation mock for NavigationBlock (uses useRouter)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

import {
  actionBlock,
  errorBlock,
  loadingBlock,
  navigationBlock,
  previewBlock,
  successBlock,
  textBlock,
} from "./fixtures/blocks.fixture";

describe("BlockRenderer", () => {
  it("renders a text block", () => {
    render(<BlockRenderer block={textBlock} />);
    expect(screen.getByText(textBlock.content)).toBeInTheDocument();
  });

  it("renders a preview block with entity badge, title, and actions", () => {
    render(<BlockRenderer block={previewBlock} />);
    expect(screen.getByText("customer")).toBeInTheDocument();
    expect(screen.getByText(previewBlock.title)).toBeInTheDocument();
    expect(screen.getByText("Ver perfil")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("renders an action block with the correct label", () => {
    render(<BlockRenderer block={actionBlock} />);
    expect(screen.getByText("Generar reporte")).toBeInTheDocument();
  });

  it("renders a navigation block with label and arrow", () => {
    render(<BlockRenderer block={navigationBlock} />);
    expect(screen.getByText("Ir a clientes")).toBeInTheDocument();
  });

  it("renders a loading block with spinner and label", () => {
    render(<BlockRenderer block={loadingBlock} />);
    expect(screen.getByText("Buscando clientes...")).toBeInTheDocument();
  });

  it("renders an error block with warning icon", () => {
    render(<BlockRenderer block={errorBlock} />);
    expect(
      screen.getByText(
        "No se pudo conectar con el servidor. Intenta de nuevo.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a success block with check icon", () => {
    render(<BlockRenderer block={successBlock} />);
    expect(
      screen.getByText("Cliente registrado exitosamente."),
    ).toBeInTheDocument();
  });

  it("renders nothing for unknown block type gracefully", () => {
    const { container } = render(
      <BlockRenderer block={{ type: "unknown" } as never} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
