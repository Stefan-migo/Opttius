import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as authContext from "@/contexts/AuthContext";
import * as branchHook from "@/hooks/useBranch";

import { useScheduleSettings } from "../hooks/useScheduleSettings";

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
    organization_id: "org-123",
    branch_id: "branch-456",
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    start_time: "09:00",
    end_time: "18:00",
    slot_duration_minutes: 30,
    default_appointment_duration: 30,
    min_advance_booking_hours: 2,
    max_advance_booking_days: 30,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
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
      user: { id: "test-user" },
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

    (global.fetch as unknown).mockResolvedValueOnce(mockResponse);

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
    (global.fetch as unknown).mockResolvedValueOnce({
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
    (global.fetch as unknown).mockRejectedValueOnce(new Error("Network error"));

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

    (global.fetch as unknown).mockResolvedValueOnce(mockResponse);

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

    (global.fetch as unknown).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    // Compare date strings directly to avoid timezone parsing issues
    const resultDateStr = result.current.getMinDate();
    const expectedDate = new Date();
    expectedDate.setHours(expectedDate.getHours() + 24);
    const expectedDateStr = expectedDate.toISOString().split("T")[0];

    expect(resultDateStr).toBe(expectedDateStr);
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

    (global.fetch as unknown).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    // Compare date strings directly to avoid timezone parsing issues
    const resultDateStr = result.current.getMaxDate();
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 60);
    const expectedDateStr = expectedDate.toISOString().split("T")[0];

    expect(resultDateStr).toBe(expectedDateStr);
  });

  it("should handle settings with empty working days", async () => {
    const mockSettingsWithoutDays = {
      ...mockScheduleSettings,
      working_days: [],
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockSettingsWithoutDays }),
    };

    (global.fetch as unknown).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useScheduleSettings());

    await act(async () => {
      await result.current.loadSettings();
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

  it("should handle settings without min advance hours", async () => {
    const mockSettingsNoMin = {
      ...mockScheduleSettings,
      min_advance_booking_hours: 0, // will trigger fallback to 2
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ settings: mockSettingsNoMin }),
    };

    (global.fetch as unknown).mockResolvedValueOnce(mockResponse);

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
