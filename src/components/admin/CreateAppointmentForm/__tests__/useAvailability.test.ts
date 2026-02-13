import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAvailability } from "../hooks/useAvailability";

import * as branchHook from "@/hooks/useBranch";
import * as authContext from "@/contexts/AuthContext";

const mockBranchContext = {
  branches: [{ id: "test-branch-123", name: "Test Branch", code: "TEST001" }],
  currentBranch: { id: "test-branch-123", name: "Test Branch", code: "TEST001" },
  isGlobalView: false,
  isSuperAdmin: false,
  isLoading: false,
  setCurrentBranch: vi.fn(),
  refreshBranches: vi.fn(),
};

const mockAuthContext = {
  user: { id: "test-user-456", email: "test@example.com" },
  loading: false,
};

// Mock the context hooks
vi.mock("@/contexts/BranchContext", () => ({
  useBranchContext: () => mockBranchContext,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => mockAuthContext,
}));

describe("useAvailability", () => {
  const mockScheduleSettings = {
    working_hours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
    },
    default_appointment_duration: 30,
  };

  const mockAvailableSlots = [
    { time_slot: "09:00:00", available: true },
    { time_slot: "09:30:00", available: true },
    { time_slot: "10:00:00", available: false }, // booked
    { time_slot: "10:30:00", available: true },
    { time_slot: "11:00:00", available: true },
  ];

  beforeEach(() => {
    // The context values are already mocked at module level
    // No need to set them in beforeEach
    
    // Mock fetch globally
    global.fetch = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    expect(result.current.availableSlots).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("should fetch availability successfully", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ 
        slots: mockAvailableSlots,
        date: "2024-01-15"
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    await act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.availableSlots).toEqual(mockAvailableSlots);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/appointments/availability?date=2024-01-15&duration=30",
      expect.any(Object)
    );
  });

  it("should handle availability fetch errors", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    });

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    await act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.availableSlots).toEqual([]);
  });

  it("should handle network errors", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    await act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.availableSlots).toEqual([]);
  });

  it("should check if time slot is available", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ slots: mockAvailableSlots })
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    // Fetch availability first
    await act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    // Test available slots
    expect(result.current.isSlotAvailable("09:00:00")).toBe(true);
    expect(result.current.isSlotAvailable("09:30:00")).toBe(true);
    expect(result.current.isSlotAvailable("10:30:00")).toBe(true);

    // Test unavailable slots
    expect(result.current.isSlotAvailable("10:00:00")).toBe(false); // booked
    expect(result.current.isSlotAvailable("12:00:00")).toBe(false); // not in list
  });

  it("should return false for slot availability when no slots loaded", () => {
    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    expect(result.current.isSlotAvailable("09:00:00")).toBe(false);
    expect(result.current.isSlotAvailable("10:00:00")).toBe(false);
  });

  it("should clear slots and errors", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ slots: mockAvailableSlots })
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    // Load some data first
    await act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    expect(result.current.availableSlots).toHaveLength(5);

    // Clear slots
    act(() => {
      result.current.clearSlots();
    });

    expect(result.current.availableSlots).toEqual([]);
    // No error property in the hook return type
  });

  it("should set loading state during fetch", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ slots: mockAvailableSlots })
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    // Start fetch
    let fetchPromise: Promise<void>;
    act(() => {
      fetchPromise = result.current.fetchAvailability("2024-01-15", 30);
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    // Wait for completion
    await act(async () => {
      await fetchPromise;
    });

    // Should no longer be loading
    expect(result.current.loading).toBe(false);
  });

  it("should handle different duration values", async () => {
    const durations = [15, 30, 45, 60];
    
    for (const duration of durations) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ slots: mockAvailableSlots })
      });

      const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

      await act(async () => {
        await result.current.fetchAvailability("2024-01-15", duration);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/appointments/availability?date=2024-01-15&duration=${duration}`,
        expect.any(Object)
      );
    }
  });

  it("should handle invalid date formats gracefully", async () => {
    const invalidDates = ["invalid-date", "", null, undefined];
    
    for (const date of invalidDates) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ slots: mockAvailableSlots })
      });

      const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

      await act(async () => {
        // @ts-ignore - testing invalid input
        await result.current.fetchAvailability(date as string, 30);
      });

      // Should still make the API call (backend should handle validation)
      expect(global.fetch).toHaveBeenCalled();
    }
  });

  it("should maintain state consistency during rapid calls", async () => {
    const mockResponses = [
      {
        ok: true,
        json: () => Promise.resolve({ 
          slots: [{ time_slot: "09:00:00", available: true }],
          date: "2024-01-15"
        }),
      },
      {
        ok: true,
        json: () => Promise.resolve({ 
          slots: [{ time_slot: "10:00:00", available: true }],
          date: "2024-01-16"
        }),
      },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce(mockResponses[0])
      .mockResolvedValueOnce(mockResponses[1]);

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    // Make two rapid calls
    const promise1 = act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    const promise2 = act(async () => {
      await result.current.fetchAvailability("2024-01-16", 30);
    });

    await Promise.all([promise1, promise2]);

    // Should have the result from the last call
    expect(result.current.availableSlots).toEqual([{ time_slot: "10:00:00", available: true }]);
  });

  it("should handle empty available slots response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ slots: [] }),
    });

    const { result } = renderHook(() => useAvailability({ scheduleSettings: mockScheduleSettings }));

    await act(async () => {
      await result.current.fetchAvailability("2024-01-15", 30);
    });

    expect(result.current.availableSlots).toEqual([]);
    // No error property in the hook return type
  });
});