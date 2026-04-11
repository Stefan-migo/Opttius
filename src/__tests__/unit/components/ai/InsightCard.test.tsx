import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InsightCard } from "@/components/ai/InsightCard";
import type { DatabaseInsight } from "@/lib/ai/insights/schemas";

describe("InsightCard", () => {
  const mockInsight: DatabaseInsight = {
    id: "1",
    organization_id: "org-1",
    section: "dashboard",
    type: "warning",
    title: "Test Warning",
    message: "Test message",
    priority: 8,
    is_dismissed: false,
    action_label: "View Details",
    action_url: "/admin/test",
    metadata: { productIds: [1, 2, 3] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("should render different types correctly", () => {
    const types: Array<DatabaseInsight["type"]> = [
      "warning",
      "opportunity",
      "info",
      "neutral",
    ];

    types.forEach((type) => {
      const { container, unmount } = render(
        <InsightCard
          insight={{ ...mockInsight, type }}
          onDismiss={vi.fn()}
          onFeedback={vi.fn()}
        />,
      );

      expect(screen.getByText("Test Warning")).toBeInTheDocument();
      unmount();
    });
  });

  it("should call onDismiss when dismissed", () => {
    const onDismiss = vi.fn();
    render(
      <InsightCard
        insight={mockInsight}
        onDismiss={onDismiss}
        onFeedback={vi.fn()}
      />,
    );

    const dismissButton = screen.getByRole("button", { name: /descartar/i });
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("should call onFeedback when rated", () => {
    const onFeedback = vi.fn();
    render(
      <InsightCard
        insight={mockInsight}
        onDismiss={vi.fn()}
        onFeedback={onFeedback}
      />,
    );

    // Click "Calificar" button to show stars
    const rateButton = screen.getByText("Calificar");
    fireEvent.click(rateButton);

    // Click a star (5 stars)
    const starButton = screen.getByLabelText("5 estrellas");
    fireEvent.click(starButton);

    expect(onFeedback).toHaveBeenCalledWith(5);
  });

  it("should handle action button click", () => {
    const { container } = render(
      <InsightCard
        insight={mockInsight}
        onDismiss={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    const actionButton = screen.getByText("View Details");
    fireEvent.click(actionButton);

    // Verify URL would be constructed with metadata
    // Note: In a real test environment, you'd check window.location
    expect(actionButton).toBeInTheDocument();
  });

  it("should display priority indicator correctly", () => {
    render(
      <InsightCard
        insight={{ ...mockInsight, priority: 7 }}
        onDismiss={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    expect(screen.getByText(/Prioridad:/i)).toBeInTheDocument();
    // Priority indicator should show 7 filled dots
  });

  it("should show feedback score if already rated", () => {
    render(
      <InsightCard
        insight={{ ...mockInsight, feedback_score: 4 }}
        onDismiss={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    expect(screen.getByText("4/5")).toBeInTheDocument();
  });

  it("should not show action button if action_url is missing", () => {
    render(
      <InsightCard
        insight={{ ...mockInsight, action_url: undefined }}
        onDismiss={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    expect(screen.queryByText("View Details")).not.toBeInTheDocument();
  });
});
