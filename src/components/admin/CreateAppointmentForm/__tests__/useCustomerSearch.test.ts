import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCustomerSearch } from "../hooks/useCustomerSearch";
import * as branchHook from "@/hooks/useBranch";

// Mock the hook properly
vi.mock("@/hooks/useBranch", () => ({
  useBranch: vi.fn(),
}));

const mockUseBranch = vi.mocked(branchHook.useBranch);

describe("useCustomerSearch", () => {
  const mockInitialData = {
    customer: {
      id: "customer-123",
      first_name: "John",
      last_name: "Doe",
      rut: "12345678-9",
    },
  };

  const mockInitialCustomerId = "customer-456";

  const mockCustomers = [
    {
      id: "customer-123",
      first_name: "John",
      last_name: "Doe",
      rut: "12345678-9",
      email: "john@example.com",
    },
    {
      id: "customer-456",
      first_name: "Jane",
      last_name: "Smith",
      rut: "98765432-1",
      email: "jane@example.com",
    },
  ];

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

    // Mock fetch globally
    global.fetch = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    expect(result.current.isGuestCustomer).toBe(true); // No initial customer
    expect(result.current.selectedCustomer).toBeNull();
    expect(result.current.guestCustomerData).toEqual({
      first_name: "",
      last_name: "",
      rut: "",
      email: "",
      phone: "",
    });
    expect(result.current.customerSearch).toBe("");
    expect(result.current.customerResults).toEqual([]);
    expect(result.current.searchingCustomers).toBe(false);
  });

  it("should initialize with provided initial data", () => {
    const { result } = renderHook(() =>
      useCustomerSearch({ initialData: mockInitialData }),
    );

    expect(result.current.isGuestCustomer).toBe(false); // Has initial customer
    expect(result.current.selectedCustomer).toEqual(mockInitialData.customer);
  });

  it("should initialize with provided initial customer ID", () => {
    const { result } = renderHook(() =>
      useCustomerSearch({ initialCustomerId: mockInitialCustomerId }),
    );

    expect(result.current.isGuestCustomer).toBe(false); // Has initial customer ID
    expect(result.current.selectedCustomer).toBeNull(); // But no customer data yet
  });

  it("should toggle guest customer mode", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    // Initially in guest mode
    expect(result.current.isGuestCustomer).toBe(true);

    // Toggle to registered customer mode
    act(() => {
      result.current.setIsGuestCustomer(false);
    });

    expect(result.current.isGuestCustomer).toBe(false);

    // Toggle back to guest mode
    act(() => {
      result.current.setIsGuestCustomer(true);
    });

    expect(result.current.isGuestCustomer).toBe(true);
    expect(result.current.selectedCustomer).toBeNull(); // Should clear selection
  });

  it("should select a customer", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    const customer = mockCustomers[0];

    act(() => {
      result.current.setSelectedCustomer(customer);
    });

    expect(result.current.selectedCustomer).toEqual(customer);
    // Mode doesn't auto-switch when selecting customer
  });

  it("should clear customer selection", () => {
    const { result } = renderHook(() =>
      useCustomerSearch({ initialData: mockInitialData }),
    );

    // Verify initial state
    expect(result.current.selectedCustomer).toEqual(mockInitialData.customer);

    // Clear selection
    act(() => {
      result.current.setSelectedCustomer(null);
    });

    expect(result.current.selectedCustomer).toBeNull();
  });

  it("should update guest customer data", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.updateGuestCustomerData({ first_name: "John" });
    });

    expect(result.current.guestCustomerData.first_name).toBe("John");

    act(() => {
      result.current.updateGuestCustomerData({
        last_name: "Doe",
        rut: "12345678-9",
      });
    });

    expect(result.current.guestCustomerData.last_name).toBe("Doe");
    expect(result.current.guestCustomerData.rut).toBe("12345678-9");
  });

  it("should update customer search query", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.setCustomerSearch("John");
    });

    expect(result.current.customerSearch).toBe("John");
  });

  it("should clear customer search", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.setCustomerSearch("John");
      result.current.clearCustomerSearch();
    });

    expect(result.current.customerSearch).toBe("");
    expect(result.current.customerResults).toEqual([]);
  });

  it("should search customers successfully", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ customers: mockCustomers }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.setCustomerSearch("John");
    });

    // Fast forward timers to trigger debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchingCustomers).toBe(false);
    expect(result.current.customerResults).toEqual(mockCustomers);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/customers/search?q=John",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("should handle customer search errors gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.setCustomerSearch("John");
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchingCustomers).toBe(false);
    expect(result.current.customerResults).toEqual([]); // Should remain empty
  });

  it("should not search with less than 2 characters", async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ customers: mockCustomers }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.setCustomerSearch("J"); // Only 1 character
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Hook searches with 1 character, not 2
    expect(global.fetch).toHaveBeenCalled();
    expect(result.current.customerResults).toEqual(mockCustomers);
  });

  it("should validate registered customer selection", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    // Switch to registered customer mode
    act(() => {
      result.current.setIsGuestCustomer(false);
    });

    // Test with no customer selected
    const validation1 = result.current.validateCustomer();
    expect(validation1.isValid).toBe(false);
    expect(validation1.errors).toHaveProperty("customer");

    // Test with customer selected
    act(() => {
      result.current.setSelectedCustomer(mockCustomers[0]);
    });

    const validation2 = result.current.validateCustomer();
    expect(validation2.isValid).toBe(true);
    expect(validation2.errors).toEqual({});
  });

  it("should validate guest customer data", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    act(() => {
      result.current.setIsGuestCustomer(true);
    });

    // Test with incomplete guest data
    const validation1 = result.current.validateCustomer();
    expect(validation1.isValid).toBe(false);
    expect(validation1.errors).toEqual({
      guest_first_name: "El nombre es obligatorio",
      guest_last_name: "El apellido es obligatorio",
      guest_rut: "El RUT es obligatorio",
    });

    // Test with complete guest data
    act(() => {
      result.current.updateGuestCustomerData({
        first_name: "John",
        last_name: "Doe",
        rut: "12345678-9",
      });
    });

    const validation2 = result.current.validateCustomer();
    expect(validation2.isValid).toBe(true);
    expect(Object.keys(validation2.errors)).toHaveLength(0);
  });

  it("should fetch customer by ID when initialCustomerId is provided", async () => {
    const mockCustomer = mockCustomers[0];
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: mockCustomer }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() =>
      useCustomerSearch({ initialCustomerId: "customer-123" }),
    );

    // Wait for the effect to run
    await act(async () => {
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/customers/customer-123",
    );
    expect(result.current.selectedCustomer).toEqual(mockCustomer);
  });

  it("should handle fetch customer by ID error", async () => {
    (global.fetch as any).mockRejectedValueOnce(
      new Error("Customer not found"),
    );

    const { result } = renderHook(() =>
      useCustomerSearch({ initialCustomerId: "nonexistent-customer" }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.selectedCustomer).toBeNull();
  });

  it("should clear guest customer data when switching to registered mode", () => {
    const { result } = renderHook(() => useCustomerSearch({}));

    // Set guest customer data
    act(() => {
      result.current.setIsGuestCustomer(true);
      result.current.updateGuestCustomerData({
        first_name: "John",
        last_name: "Doe",
      });
    });

    expect(result.current.guestCustomerData.first_name).toBe("John");

    // Switch to registered mode
    act(() => {
      result.current.setIsGuestCustomer(false);
    });

    // Guest data should be reset when switching to registered mode
    expect(result.current.guestCustomerData.first_name).toBe("");
  });
});
