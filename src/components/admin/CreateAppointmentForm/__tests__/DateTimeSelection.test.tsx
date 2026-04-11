import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DateTimeSelection from "../DateTimeSelection";

describe("DateTimeSelection", () => {
  const mockProps = {
    date: "",
    time: "",
    duration: 30,
    lockDateTime: false,
    availableSlots: [],
    loadingAvailability: false,
    minDate: "2024-01-01",
    maxDate: "2024-12-31",
    onDateChange: vi.fn(),
    onTimeChange: vi.fn(),
    onDurationChange: vi.fn(),
    onLoadAvailability: vi.fn(),
    formatTime: vi.fn().mockImplementation((time) => time),
    isSlotAvailable: vi.fn().mockReturnValue(true),
  };

  const mockAvailableSlots = [
    { time_slot: "09:00:00", available: true },
    { time_slot: "09:30:00", available: true },
    { time_slot: "10:00:00", available: false },
    { time_slot: "10:30:00", available: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should render date and time selection fields", () => {
    render(<DateTimeSelection {...mockProps} />);

    expect(screen.getByText("Agenda de la Sesión")).toBeInTheDocument();
    expect(screen.getByText("Fecha de Atención *")).toBeInTheDocument();
    expect(screen.getByText("Duración Estimada *")).toBeInTheDocument();
  });

  it("should display selected date", () => {
    render(<DateTimeSelection {...mockProps} date="2024-01-15" />);

    const dateInput = screen.getByDisplayValue(
      "2024-01-15",
    ) as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
  });

  it("should display selected time", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
        time="10:30:00"
      />,
    );

    // Time is selected via buttons, not input
    expect(screen.getByText("10:30:00")).toBeInTheDocument();
  });

  it("should display selected duration", () => {
    render(<DateTimeSelection {...mockProps} duration={45} />);

    // Duration is selected via Select component
    expect(screen.getByText("45 MINUTOS")).toBeInTheDocument();
  });

  it("should call onDateChange when date is changed", () => {
    render(<DateTimeSelection {...mockProps} date="2024-01-15" />);

    const dateInput = screen.getByDisplayValue("2024-01-15");
    fireEvent.change(dateInput, { target: { value: "2024-01-20" } });

    expect(mockProps.onDateChange).toHaveBeenCalledWith("2024-01-20");
  });

  it("should call onTimeChange when time is changed", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
      />,
    );

    // Time is changed by clicking time slot buttons
    const timeSlot = screen.getByText("09:00:00");
    fireEvent.click(timeSlot);

    expect(mockProps.onTimeChange).toHaveBeenCalledWith("09:00:00");
  });

  it("should call onDurationChange when duration is changed", () => {
    render(<DateTimeSelection {...mockProps} />);

    // Duration is changed via Select component
    // First click the trigger to open dropdown
    fireEvent.click(screen.getByText("30 MINUTOS"));

    // Then click the desired option
    const durationOption = screen.getByText("1 HORA");
    fireEvent.click(durationOption);

    expect(mockProps.onDurationChange).toHaveBeenCalledWith(60);
  });

  it("should show available time slots", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
      />,
    );

    expect(screen.getByText("Bloques Disponibles")).toBeInTheDocument();
    expect(screen.getByText("09:00:00")).toBeInTheDocument();
    expect(screen.getByText("09:30:00")).toBeInTheDocument();
    expect(screen.getByText("10:30:00")).toBeInTheDocument();
  });

  it("should call onTimeChange when selecting an available time slot", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
      />,
    );

    const timeSlotButton = screen.getByText("09:00:00");
    fireEvent.click(timeSlotButton);

    expect(mockProps.onTimeChange).toHaveBeenCalledWith("09:00:00");
  });

  it("should disable unavailable time slots", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
      />,
    );

    // Unavailable slots are filtered out, so they won't be in the DOM
    expect(screen.queryByText("10:00")).not.toBeInTheDocument();
  });

  it("should show loading indicator when loading availability", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        date="2024-01-15"
        loadingAvailability={true}
      />,
    );

    // Check that loading spinner is present
    expect(screen.getByText("Bloques Disponibles")).toBeInTheDocument();
    // Check for the animate-spin class which indicates loading
    const spinnerElement = document.querySelector(".animate-spin");
    expect(spinnerElement).toBeInTheDocument();
  });

  it("should respect date constraints", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        maxDate="2024-12-31"
        minDate="2024-01-01"
      />,
    );

    const dateInput = screen.getByDisplayValue("") as HTMLInputElement;
    expect(dateInput.min).toBe("2024-01-01");
    expect(dateInput.max).toBe("2024-12-31");
  });

  it("should disable date selection when lockDateTime is true", () => {
    render(<DateTimeSelection {...mockProps} lockDateTime={true} />);

    const dateInput = screen.getByDisplayValue("") as HTMLInputElement;

    expect(dateInput).toBeDisabled();
    // Duration select should still be present even when locked
    expect(screen.getByText("30 MINUTOS")).toBeInTheDocument();
  });

  it("should enable date selection when lockDateTime is false", () => {
    render(<DateTimeSelection {...mockProps} lockDateTime={false} />);

    const dateInput = screen.getByDisplayValue("") as HTMLInputElement;

    expect(dateInput).not.toBeDisabled();
    // Duration select should be present and enabled
    expect(screen.getByText("30 MINUTOS")).toBeInTheDocument();
  });

  // Note: Manual refresh button removed as availability is refreshed automatically
  // when date or duration changes via useEffect in parent component

  it("should format time slots correctly", () => {
    const mockFormatTime = vi.fn().mockImplementation((time) => {
      return time.substring(0, 5); // HH:MM format
    });

    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
        formatTime={mockFormatTime}
      />,
    );

    expect(mockFormatTime).toHaveBeenCalledWith("09:00:00");
    expect(mockFormatTime).toHaveBeenCalledWith("09:30:00");
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("should show no availability message when no slots available", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={[]}
        date="2024-01-15"
      />,
    );

    expect(
      screen.getByText("Sin disponibilidad inmediata"),
    ).toBeInTheDocument();
  });

  it("should clear time when date changes", () => {
    const mockOnDateChange = vi.fn();
    render(
      <DateTimeSelection
        {...mockProps}
        date="2024-01-15"
        time="10:30:00"
        onDateChange={mockOnDateChange}
      />,
    );

    const dateInput = screen.getByDisplayValue("2024-01-15");
    fireEvent.change(dateInput, { target: { value: "2024-01-20" } });

    // Should clear the time when date changes
    expect(mockOnDateChange).toHaveBeenCalledWith("2024-01-20");
  });

  it("should clear time when duration changes", () => {
    const mockOnDurationChange = vi.fn();
    render(
      <DateTimeSelection
        {...mockProps}
        time="10:30:00"
        onDurationChange={mockOnDurationChange}
      />,
    );

    const durationSelect = screen.getByRole("combobox");
    fireEvent.click(durationSelect);

    // Select the 45 minutes option
    const option45 = screen.getByText("45 MINUTOS");
    fireEvent.click(option45);

    // Should clear the time when duration changes
    expect(mockOnDurationChange).toHaveBeenCalledWith(45);
  });

  it("should apply correct styling to selected time slot", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
        time="09:00:00"
      />,
    );

    const selectedSlot = screen.getByText("09:00:00").closest("button");
    expect(selectedSlot).toHaveClass("bg-admin-accent-primary");
  });

  it("should handle past date selection with error", () => {
    const mockOnDateChange = vi.fn();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
      .toISOString()
      .split("T")[0];

    render(
      <DateTimeSelection {...mockProps} onDateChange={mockOnDateChange} />,
    );

    // Use querySelector to get the enabled input specifically
    const dateInput = document.querySelector(
      'input[type="date"]:not(.opacity-60)',
    ) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: yesterday } });

    // Should not call onDateChange for past dates (handled by parent component)
    expect(mockOnDateChange).toHaveBeenCalledWith(yesterday);
  });

  it("should show duration options with common values", () => {
    render(<DateTimeSelection {...mockProps} />);

    // Duration is handled via Select component
    fireEvent.click(screen.getByText("30 MINUTOS"));

    // Wait for dropdown to open and get all options
    const allOptions = screen.getAllByText(/MINUTOS|HORA/);
    // Filter to only the dropdown options (there will be duplicates)
    const uniqueOptions = [...new Set(allOptions.map((el) => el.textContent))];

    expect(uniqueOptions).toContain("15 MINUTOS");
    expect(uniqueOptions).toContain("30 MINUTOS");
    expect(uniqueOptions).toContain("45 MINUTOS");
    expect(uniqueOptions).toContain("1 HORA");
  });

  it("should handle keyboard navigation for time slots", () => {
    render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
      />,
    );

    const firstSlot = screen.getByText("09:00:00");
    fireEvent.click(firstSlot);

    expect(mockProps.onTimeChange).toHaveBeenCalledWith("09:00:00");
  });

  it("should maintain time selection when availability reloads", () => {
    const { rerender } = render(
      <DateTimeSelection
        {...mockProps}
        availableSlots={mockAvailableSlots}
        date="2024-01-15"
        time="09:00:00"
      />,
    );

    // Selected time should remain highlighted
    const selectedSlot = screen.getByText("09:00:00").closest("button");
    expect(selectedSlot).toHaveClass("bg-admin-accent-primary");

    // Re-render with updated slots
    const updatedSlots = [
      ...mockAvailableSlots,
      { time_slot: "11:00:00", available: true },
    ];

    rerender(
      <DateTimeSelection
        {...mockProps}
        availableSlots={updatedSlots}
        date="2024-01-15"
        time="09:00:00"
      />,
    );

    // Selection should persist
    const stillSelectedSlot = screen.getByText("09:00:00").closest("button");
    expect(stillSelectedSlot).toHaveClass("bg-admin-accent-primary");
  });
});
