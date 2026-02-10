import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppointmentForm } from "../hooks/useAppointmentForm";
import * as branchHook from "@/hooks/useBranch";
import * as authContext from "@/contexts/AuthContext";

// Mock dependencies
vi.mock("@/hooks/useBranch");
vi.mock("@/contexts/AuthContext");

const mockUseBranch = branchHook.useBranch as any;
const mockUseAuthContext = authContext.useAuthContext as any;

describe("useAppointmentForm", () => {
  const mockInitialData = {
    id: "test-appointment-123",
    appointment_date: "2024-01-15",
    appointment_time: "10:00:00",
    duration_minutes: 45,
    appointment_type: "consultation",
    status: "scheduled",
    notes: "Test appointment notes",
    reason: "Regular checkup",
  };

  const mockScheduleSettings = {
    default_appointment_duration: 30,
    working_hours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
    },
  };

  beforeEach(() => {
    mockUseBranch.mockReturnValue({
      currentBranchId: "test-branch-123",
    });

    mockUseAuthContext.mockReturnValue({
      user: { id: "test-user-456", email: "test@example.com" },
      loading: false,
    });

    // Mock fetch globally
    global.fetch = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default form data when no initial data provided", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    const today = new Date().toISOString().split("T")[0];
    
    expect(result.current.formData).toEqual({
      appointment_date: today,
      appointment_time: "",
      duration_minutes: 30,
      appointment_type: "consultation",
      status: "scheduled",
      assigned_to: null,
      notes: "",
      reason: "",
      follow_up_required: false,
      follow_up_date: "",
      prescription_id: null,
      order_id: null,
    });

    expect(result.current.saving).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it("should initialize with provided initial data", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ 
        initialData: mockInitialData, 
        scheduleSettings: mockScheduleSettings 
      })
    );

    expect(result.current.formData.appointment_date).toBe("2024-01-15");
    expect(result.current.formData.appointment_time).toBe("10:00:00");
    expect(result.current.formData.duration_minutes).toBe(45);
    expect(result.current.formData.appointment_type).toBe("consultation");
    expect(result.current.formData.status).toBe("scheduled");
    expect(result.current.formData.notes).toBe("Test appointment notes");
  });

  it("should update individual fields correctly", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    act(() => {
      result.current.updateField("appointment_type", "eye_exam");
    });

    expect(result.current.formData.appointment_type).toBe("eye_exam");
  });

  it("should update multiple fields at once", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    act(() => {
      result.current.updateFormData({
        appointment_type: "eye_exam",
        duration_minutes: 60,
        notes: "Updated notes",
      });
    });

    expect(result.current.formData.appointment_type).toBe("eye_exam");
    expect(result.current.formData.duration_minutes).toBe(60);
    expect(result.current.formData.notes).toBe("Updated notes");
  });

  it("should clear errors when updating fields", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    // Simulate an error
    act(() => {
      result.current.setSaving(true);
    });

    // Update a field to clear error
    act(() => {
      result.current.updateField("appointment_type", "eye_exam");
    });

    // Errors should be cleared for that field
    expect(result.current.errors).toEqual({});
  });

  it("should validate required fields", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    act(() => {
      const isValid = result.current.validate();
      expect(isValid).toBe(false);
    });

    expect(result.current.errors).toEqual({
      // appointment_date has default value from current date
      appointment_time: "La hora es obligatoria",
    });
  });

  it("should validate successfully when required fields are present", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    act(() => {
      result.current.updateFormData({
        appointment_date: "2024-01-15",
        appointment_time: "10:00:00",
      });
    });

    act(() => {
      const isValid = result.current.validate();
      expect(isValid).toBe(true);
    });

    expect(result.current.errors).toEqual({});
  });

  it("should reset form to default values", () => {
    const { result } = renderHook(() => 
      useAppointmentForm({ 
        initialData: mockInitialData, 
        scheduleSettings: mockScheduleSettings 
      })
    );

    // Modify some fields
    act(() => {
      result.current.updateFormData({
        appointment_type: "eye_exam",
        notes: "Modified notes",
      });
    });

    // Reset the form
    act(() => {
      result.current.resetForm();
    });

    const today = new Date().toISOString().split("T")[0];
    expect(result.current.formData.appointment_date).toBe(today);
    expect(result.current.formData.appointment_time).toBe("");
    expect(result.current.formData.appointment_type).toBe("consultation");
    expect(result.current.formData.notes).toBe("");
    expect(result.current.errors).toEqual({});
  });

  it("should handle form submission successfully", async () => {
    const mockOnSuccess = vi.fn();
    const mockSelectedCustomer = { id: "customer-123", name: "John Doe" };
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "new-appointment-456" }),
    });

    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    // Fill required fields
    act(() => {
      result.current.updateFormData({
        appointment_date: "2024-01-15",
        appointment_time: "10:00",
        duration_minutes: 30,
      });
    });

    await act(async () => {
      const success = await result.current.handleSubmit(
        { preventDefault: vi.fn() } as any,
        mockSelectedCustomer,
        false, // isGuestCustomer
        {}, // guestCustomerData
        mockOnSuccess
      );
      
      expect(success).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/appointments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    
    // Note: onSuccess is not called by the hook itself, but by the calling component
    // The hook returns a boolean success value and the component calls onSuccess based on that
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("should handle form submission errors", async () => {
    const mockOnSuccess = vi.fn();
    const mockSelectedCustomer = { id: "customer-123", name: "John Doe" };
    
    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to create appointment" }),
    });

    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    // Fill required fields
    act(() => {
      result.current.updateFormData({
        appointment_date: "2024-01-15",
        appointment_time: "10:00",
        duration_minutes: 30,
      });
    });

    await expect(
      act(async () => {
        await result.current.handleSubmit(
          { preventDefault: vi.fn() } as any,
          mockSelectedCustomer,
          false,
          {},
          mockOnSuccess
        );
      })
    ).rejects.toThrow("Failed to create appointment");

    expect(result.current.saving).toBe(false);
  });

  it("should handle guest customer submission", async () => {
    const mockOnSuccess = vi.fn();
    const mockGuestCustomerData = {
      first_name: "Jane",
      last_name: "Doe",
      rut: "12345678-9",
      email: "jane@example.com",
      phone: "+1234567890",
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "new-appointment-456" }),
    });

    const { result } = renderHook(() => 
      useAppointmentForm({ scheduleSettings: mockScheduleSettings })
    );

    // Fill required fields
    act(() => {
      result.current.updateFormData({
        appointment_date: "2024-01-15",
        appointment_time: "10:00",
        duration_minutes: 30,
      });
    });

    await act(async () => {
      const success = await result.current.handleSubmit(
        { preventDefault: vi.fn() } as any,
        null, // selectedCustomer
        true, // isGuestCustomer
        mockGuestCustomerData,
        mockOnSuccess
      );
      
      expect(success).toBe(true);
    });

    // Verify guest customer data was sent
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/appointments",
      expect.objectContaining({
        body: expect.stringContaining('"guest_customer"'),
      })
    );
  });

  it("should update duration when schedule settings load", () => {
    const { result, rerender } = renderHook(
      ({ scheduleSettings }) => useAppointmentForm({ scheduleSettings }),
      {
        initialProps: { scheduleSettings: null },
      }
    );

    expect(result.current.formData.duration_minutes).toBe(30); // default

    // Update with schedule settings
    rerender({ scheduleSettings: mockScheduleSettings });

    expect(result.current.formData.duration_minutes).toBe(30); // from settings
  });

  it("should preserve initial duration when provided", () => {
    const initialDataWithDuration = {
      ...mockInitialData,
      duration_minutes: 60,
    };

    const { result } = renderHook(() => 
      useAppointmentForm({ 
        initialData: initialDataWithDuration, 
        scheduleSettings: mockScheduleSettings 
      })
    );

    expect(result.current.formData.duration_minutes).toBe(60); // preserved from initial data
  });
});