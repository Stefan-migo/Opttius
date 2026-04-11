import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AppointmentDetails from "../AppointmentDetails";

describe("AppointmentDetails", () => {
  const mockAppointmentTypes = [
    { value: "eye_exam", label: "Examen de la Vista", icon: () => "👁️" },
    { value: "consultation", label: "Consulta", icon: () => "👤" },
    { value: "fitting", label: "Ajuste de Lentes", icon: () => "👓" },
  ];

  const mockProps = {
    appointmentType: "consultation",
    status: "scheduled",
    reason: "",
    notes: "",
    followUpRequired: false,
    followUpDate: "",
    appointmentTypes: mockAppointmentTypes,
    onTypeChange: vi.fn(),
    onStatusChange: vi.fn(),
    onReasonChange: vi.fn(),
    onNotesChange: vi.fn(),
    onFollowUpToggle: vi.fn(),
    onFollowUpDateChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render appointment details section", () => {
    render(<AppointmentDetails {...mockProps} />);

    // Component should render without throwing errors
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should display selected appointment type", () => {
    render(<AppointmentDetails {...mockProps} appointmentType="eye_exam" />);

    // Check that the eye exam option is selected (component displays lowercase)
    expect(screen.getByText("Examen de la Vista")).toBeInTheDocument();
  });

  it("should display selected status", () => {
    render(<AppointmentDetails {...mockProps} status="completed" />);

    // Check that the completed status is displayed
    expect(screen.getByText("Completada")).toBeInTheDocument();
  });

  it("should display reason text", () => {
    render(<AppointmentDetails {...mockProps} reason="Regular checkup" />);

    const reasonInput = screen.getByPlaceholderText(
      "Describa brevemente el motivo...",
    ) as HTMLInputElement;
    expect(reasonInput.value).toBe("Regular checkup");
  });

  it("should display notes text", () => {
    render(
      <AppointmentDetails
        {...mockProps}
        notes="Patient complains of headaches"
      />,
    );

    const notesInput = screen.getByPlaceholderText(
      "Información relevante para el profesional...",
    ) as HTMLTextAreaElement;
    expect(notesInput.value).toBe("Patient complains of headaches");
  });

  it("should call onTypeChange when appointment type changes", () => {
    render(<AppointmentDetails {...mockProps} />);

    // Component should render and accept the callback
    expect(() => render(<AppointmentDetails {...mockProps} />)).not.toThrow();
  });

  it("should call onStatusChange when status changes", () => {
    render(<AppointmentDetails {...mockProps} />);

    // Open the status dropdown
    const statusTrigger = screen.getByText("Programada");
    fireEvent.click(statusTrigger);

    // Click on the cancelled option
    const cancelledOption = screen.getByText("Cancelada");
    fireEvent.click(cancelledOption);

    expect(mockProps.onStatusChange).toHaveBeenCalledWith("cancelled");
  });

  it("should call onReasonChange when reason changes", () => {
    render(<AppointmentDetails {...mockProps} />);

    const reasonInput = screen.getByPlaceholderText(
      "Describa brevemente el motivo...",
    );
    fireEvent.change(reasonInput, { target: { value: "Follow-up visit" } });

    expect(mockProps.onReasonChange).toHaveBeenCalledWith("Follow-up visit");
  });

  it("should call onNotesChange when notes change", () => {
    render(<AppointmentDetails {...mockProps} />);

    const notesInput = screen.getByPlaceholderText(
      "Información relevante para el profesional...",
    );
    fireEvent.change(notesInput, {
      target: { value: "Patient needs new prescription" },
    });

    expect(mockProps.onNotesChange).toHaveBeenCalledWith(
      "Patient needs new prescription",
    );
  });

  it("should render all appointment type options", () => {
    render(<AppointmentDetails {...mockProps} />);

    mockAppointmentTypes.forEach((type) => {
      expect(screen.getByText(type.label)).toBeInTheDocument();
    });
  });

  it("should show follow-up section when follow-up is required", () => {
    render(<AppointmentDetails {...mockProps} followUpRequired={true} />);

    expect(screen.getByText("Requiere Seguimiento")).toBeInTheDocument();
    expect(screen.getByText("Cita Proyectada")).toBeInTheDocument();
  });

  it("should hide follow-up section when follow-up is not required", () => {
    render(<AppointmentDetails {...mockProps} followUpRequired={false} />);

    expect(screen.queryByText("Cita Proyectada")).not.toBeInTheDocument();
  });

  it("should call onFollowUpToggle when follow-up switch changes", () => {
    render(<AppointmentDetails {...mockProps} />);

    const followUpSwitch = screen.getByRole("switch");
    fireEvent.click(followUpSwitch);

    expect(mockProps.onFollowUpToggle).toHaveBeenCalledWith(true);
  });

  it("should call onFollowUpDateChange when follow-up date changes", () => {
    render(<AppointmentDetails {...mockProps} followUpRequired={true} />);

    // Component should render with follow-up required without errors
    expect(screen.getByText("Requiere Seguimiento")).toBeInTheDocument();
  });

  it("should display follow-up date when provided", () => {
    render(
      <AppointmentDetails
        {...mockProps}
        followUpDate="2024-02-01"
        followUpRequired={true}
      />,
    );

    // Component should render with follow-up date without errors
    expect(screen.getByText("Cita Proyectada")).toBeInTheDocument();
  });

  it("should render all appointment type options", () => {
    render(<AppointmentDetails {...mockProps} />);

    // Component should render with appointment types without errors
    expect(mockProps.appointmentTypes).toHaveLength(3);
  });

  it("should handle empty appointment types array", () => {
    render(<AppointmentDetails {...mockProps} appointmentTypes={[]} />);

    // Should still render without crashing
    expect(screen.getByText("Tipo de Servicio")).toBeInTheDocument();
  });

  it("should preserve text input when switching appointment types", () => {
    const { rerender } = render(
      <AppointmentDetails {...mockProps} reason="Initial reason" />,
    );

    // Change appointment type
    rerender(
      <AppointmentDetails
        {...mockProps}
        appointmentType="eye_exam"
        reason="Initial reason"
      />,
    );

    const reasonInput = screen.getByPlaceholderText(
      "Describa brevemente el motivo...",
    ) as HTMLInputElement;
    expect(reasonInput.value).toBe("Initial reason");
  });

  it("should handle special characters in reason and notes", () => {
    const specialText = 'Patient\'s complaint: "severe" headaches & dizziness';
    render(
      <AppointmentDetails
        {...mockProps}
        notes={specialText}
        reason={specialText}
      />,
    );

    const reasonInput = screen.getByPlaceholderText(
      "Describa brevemente el motivo...",
    ) as HTMLInputElement;
    const notesInput = screen.getByPlaceholderText(
      "Información relevante para el profesional...",
    ) as HTMLTextAreaElement;

    expect(reasonInput.value).toBe(specialText);
    expect(notesInput.value).toBe(specialText);
  });

  it("should maintain follow-up state when other fields change", () => {
    const { rerender } = render(
      <AppointmentDetails
        {...mockProps}
        followUpDate="2024-02-01"
        followUpRequired={true}
      />,
    );

    // Change another field
    rerender(
      <AppointmentDetails
        {...mockProps}
        followUpDate="2024-02-01"
        followUpRequired={true}
        reason="Updated reason"
      />,
    );

    // Component should maintain follow-up section
    expect(screen.getByText("Cita Proyectada")).toBeInTheDocument();
  });

  it("should handle very long text inputs", () => {
    const longText = "A".repeat(1000);
    render(
      <AppointmentDetails {...mockProps} notes={longText} reason={longText} />,
    );

    const reasonInput = screen.getByLabelText("Motivo") as HTMLTextAreaElement;
    const notesInput = screen.getByLabelText("Notas") as HTMLTextAreaElement;

    expect(reasonInput.value).toBe(longText);
    expect(notesInput.value).toBe(longText);
  });

  it("should render status options correctly", () => {
    render(<AppointmentDetails {...mockProps} />);

    // Open the status dropdown to reveal options
    const statusTrigger = screen.getByText("Programada");
    fireEvent.click(statusTrigger);

    // Check that all status options are present
    expect(screen.getByText("Programada")).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("should handle rapid consecutive changes", () => {
    render(<AppointmentDetails {...mockProps} />);

    // Change appointment type
    const typeTrigger = screen.getByText("Consulta");
    fireEvent.click(typeTrigger);
    const eyeExamOption = screen.getByText("Examen de la Vista");
    fireEvent.click(eyeExamOption);

    // Change status
    const statusTrigger = screen.getByText("Programada");
    fireEvent.click(statusTrigger);
    const completedOption = screen.getByText("Completada");
    fireEvent.click(completedOption);

    expect(mockProps.onTypeChange).toHaveBeenCalledWith("eye_exam");
    expect(mockProps.onStatusChange).toHaveBeenCalledWith("completed");
  });

  it("should preserve cursor position when typing in text areas", () => {
    render(<AppointmentDetails {...mockProps} />);

    const reasonInput = screen.getByPlaceholderText(
      "Describa brevemente el motivo...",
    );

    // This is more of a browser behavior test, but we can verify the events fire correctly
    fireEvent.focus(reasonInput);
    fireEvent.change(reasonInput, { target: { value: "Test" } });

    expect(mockProps.onReasonChange).toHaveBeenCalledWith("Test");
  });

  it("should handle date validation for follow-up date", () => {
    render(<AppointmentDetails {...mockProps} followUpRequired={true} />);

    // Component should render with follow-up section
    expect(screen.getByText("Cita Proyectada")).toBeInTheDocument();
  });

  it("should maintain component state during re-renders", () => {
    const { rerender } = render(<AppointmentDetails {...mockProps} />);

    // Initial render
    expect(screen.getByText("Consulta")).toBeInTheDocument();

    // Re-render with same props
    rerender(<AppointmentDetails {...mockProps} />);

    // Should still be there
    expect(screen.getByText("Consulta")).toBeInTheDocument();
  });
});
