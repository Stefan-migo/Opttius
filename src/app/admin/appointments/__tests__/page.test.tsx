import { render, screen } from "@testing-library/react";
import React from "react";

import AppointmentsPage from "../page";

// Mock next/dynamic: use React.lazy to properly trigger Suspense boundary
vi.mock("next/dynamic", () => ({
  default: (
    _importFn: () => Promise<{ default: React.ComponentType }>,
    options?: { ssr?: boolean },
  ) => {
    if (options?.ssr === false) {
      return React.lazy(() =>
        Promise.resolve({ default: () => <div data-testid="lazy-content" /> }),
      );
    }
    return _importFn;
  },
}));

describe("AppointmentsPage", () => {
  it("renders Suspense fallback before dynamic content loads", () => {
    render(<AppointmentsPage />);
    // The Suspense boundary renders "Cargando..." for ssr:false dynamic import
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });
});
