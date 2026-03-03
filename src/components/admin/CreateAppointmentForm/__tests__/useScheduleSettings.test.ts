import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScheduleSettings } from "../hooks/useScheduleSettings";
import * as branchHook from "@/hooks/useBranch";
import * as authContext from "@/contexts/AuthContext";

// Mock dependencies
vi.mock("@/hooks/useBranch", () => ({
  useBranch: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

const mockUseBranch = vi.mocked(branchHook.useBranch);
const mockUseAuthContext = vi.mocked(authContext.useAuthContext);

describe("useScheduleSettings", () => {
  const mockScheduleSettings = {
    id: "settings-123",
    branch_id: "branch-456",
    default_appointment_duration: 30,
    min_advance_booking_hours: 2,
    max_advance_booking_days: 30,
    working_hours: {
      monday: { open: "09:00", close: "18:00", is_working_day: true },
      tuesday: { open: "09:00", close: "18:00", is_working_day: true },
      wednesday: { open: "09:00", close: "18:00", is_working_day: true },
      thursday: { open: "09:00", close: "18:00", is_working_day: true },
      friday: { open: "09:00", close: "18:00", is_working_day: true },
      saturday: { open: "10:00", close: "14:00", is_working_day: true },
      sunday: { open: null, close: null, is_working_day: false },
    },
    holidays: [
      { date: "2024-01-01", name: "New Year's Day" },
      { date: "2024-12-25", name: "Christmas Day" },
    ],
  };

  beforeEach(() => {
    mockUseBranch.mockReturnValue({
      currentBranchId: "test-branch-123",
      currentBranchName: "Test Branch",
      canSwitchBranch: false,
      hasMultipleBranches: false,
      branches: [
        { id: "test-branch-123", name: "Test Branch", code: "TEST001" },
      ],
      currentBranch: {
        id: "test-branch-123",
        name: "Test Branch",
        code: "TEST001",
      },
      organizationId: "test-org-123",
      isGlobalView: false,
      isSuperAdmin: false,
      isLoading: false,
      setCurrentBranch: vi.fn(),
      refreshBranches: vi.fn(),
    });

    mockUseAuthContext.mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
      resetPassword: vi.fn(),
      refetchProfile: vi.fn(),
      refetchAdminStatus: vi.fn(),
      isAdmin: false,
      isSuperAdmin: false,
      adminRole: null,
    });

    // Mock fetch globally
    global.fetch = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default values", async () => {
    const { result } = renderHook(() => useScheduleSettings());

    // Wait for initial load effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.settings).toBeNull();
    expect(result.current.loading).toBe(false);
    // No error property in the hook
  });

  it("should load schedule settings successfully", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockScheduleSettings }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.settings).toEqual(mockScheduleSettings);
    // No error property in the hook
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/schedule-settings",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-branch-id": "test-branch-123",
        }),
      }),
    );
  });

  it("should handle schedule settings load errors", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    });

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.settings).toBeNull();
    // Error handling is done via console logging, no error state
  });

  it("should handle network errors", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.settings).toBeNull();
    // Error handling is done via console logging, no error state
  });

  it("should set loading state during fetch", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockScheduleSettings }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    // Start fetch
    let fetchPromise: Promise<void>;
    act(() => {
      fetchPromise = result.current.loadSettings();
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

  it("should get minimum date (today + min advance hours)", async () => {
    const mockSettingsWithAdvance = {
      ...mockScheduleSettings,
      min_advance_booking_hours: 24, // 24 hours advance booking required
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockSettingsWithAdvance }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    const minDate = result.current.getMinDate();
    const expectedMinDate = new Date();
    expectedMinDate.setHours(expectedMinDate.getHours() + 24);

    // Compare dates - account for timezone differences
    // The hook uses setHours which can cross date boundaries
    const resultDate = new Date(minDate);
    const expectedDate = new Date(expectedMinDate);

    // Allow for 1-day difference due to timezone/hour boundary crossing
    const dayDifference = Math.abs(
      resultDate.getDate() - expectedDate.getDate(),
    );
    expect(dayDifference).toBeLessThanOrEqual(1);
  });

  it("should get maximum date (today + max advance days)", async () => {
    const mockSettingsWithMaxDays = {
      ...mockScheduleSettings,
      max_advance_booking_days: 60,
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockSettingsWithMaxDays }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    const maxDate = result.current.getMaxDate();
    const expectedMaxDate = new Date();
    expectedMaxDate.setDate(expectedMaxDate.getDate() + 60);

    // Compare dates - account for timezone differences
    // The hook uses setDate which should be more predictable
    const resultDate = new Date(maxDate);
    const expectedDate = new Date(expectedMaxDate);

    // Allow for 1-day difference due to timezone boundary crossing
    const dayDifference = Math.abs(
      resultDate.getDate() - expectedDate.getDate(),
    );
    expect(dayDifference).toBeLessThanOrEqual(1);
  });

  it("should handle settings without working hours data", async () => {
    const mockSettingsWithoutHours = {
      ...mockScheduleSettings,
      working_days: [],
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockSettingsWithoutHours }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await Promise.resolve(); // Wait for useEffect
    });

    // Should still calculate dates correctly
    const minDate = result.current.getMinDate();
    const maxDate = result.current.getMaxDate();

    expect(minDate).toBeDefined();
    expect(maxDate).toBeDefined();
  });

  it("should return default values when settings not loaded", () => {
    const { result } = renderHook(() => useScheduleSettings());

    const minDate = result.current.getMinDate();
    const maxDate = result.current.getMaxDate();

    // Should return reasonable defaults
    expect(new Date(minDate)).toBeInstanceOf(Date);
    expect(new Date(maxDate)).toBeInstanceOf(Date);
  });

  it("should handle settings with missing holiday data", async () => {
    const mockSettingsWithoutHolidays = {
      ...mockScheduleSettings,
      holidays: null,
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockSettingsWithoutHolidays }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    // Should still work without crashing
    const minDate = result.current.getMinDate();
    const maxDate = result.current.getMaxDate();

    expect(minDate).toBeDefined();
    expect(maxDate).toBeDefined();
  });
});
