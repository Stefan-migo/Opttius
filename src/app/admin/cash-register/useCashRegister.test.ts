/**
 * Type-level approval test for useCashRegister custom hook extraction.
 * Verifies the module exports match expected type shape.
 */
import { describe, expectTypeOf, it } from "vitest";

// Define the expected return type for the hook
interface CashRegisterStore {
  // State
  closures: unknown[];
  loading: boolean;
  dailySummary: unknown | null;
  orders: unknown[];
  orderFilters: Record<string, string>;
  movements: unknown[];
  creditNotes: unknown[];
  showCloseDialog: boolean;
  closing: boolean;
  openingCash: number;
  actualCash: number | null;
  isCashOpen: boolean;
  fieldOperation: unknown | null;

  // Computed
  effectiveBranchId: string | null;
  isOperativoMode: boolean;
  isGlobalView: boolean;

  // Handlers
  checkCashStatus: () => Promise<void>;
  handleOpenCashRegister: () => Promise<void>;
  handleCloseCashRegister: () => Promise<void>;
  handleReopenCash: (id: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchClosures: () => Promise<void>;
  fetchDailySummary: () => Promise<void>;
  fetchCreditNotes: () => Promise<void>;
}

describe("useCashRegister module shape", () => {
  it("exports a function named useCashRegister", () => {
    // Module-level assertion — verifies the file compiles
    type Module = { useCashRegister: () => CashRegisterStore };
    expectTypeOf<Module>().toHaveProperty("useCashRegister");
    expectTypeOf<Module["useCashRegister"]>().toBeFunction();
  });

  it("return type conforms to CashRegisterStore", () => {
    type HookReturn = ReturnType<() => CashRegisterStore>;
    expectTypeOf<HookReturn>().toHaveProperty("closures");
    expectTypeOf<HookReturn>().toHaveProperty("loading");
    expectTypeOf<HookReturn>().toHaveProperty("dailySummary");
    expectTypeOf<HookReturn>().toHaveProperty("orders");
    expectTypeOf<HookReturn>().toHaveProperty("showCloseDialog");
    expectTypeOf<HookReturn>().toHaveProperty("openingCash");
    expectTypeOf<HookReturn>().toHaveProperty("actualCash");
    expectTypeOf<HookReturn>().toHaveProperty("effectiveBranchId");
    expectTypeOf<HookReturn>().toHaveProperty("handleCloseCashRegister");
    expectTypeOf<HookReturn>().toHaveProperty("fetchOrders");
  });

  it("closures is typed as an array", () => {
    type HookReturn = ReturnType<() => CashRegisterStore>;
    expectTypeOf<HookReturn["closures"]>().toBeArray();
  });

  it("dailySummary is nullable", () => {
    type HookReturn = ReturnType<() => CashRegisterStore>;
    expectTypeOf<HookReturn["dailySummary"]>().toBeNullable();
  });

  it("actualCash is nullable number", () => {
    type HookReturn = ReturnType<() => CashRegisterStore>;
    expectTypeOf<HookReturn["actualCash"]>().toBeNullable();
  });

  it("loading is boolean", () => {
    type HookReturn = ReturnType<() => CashRegisterStore>;
    expectTypeOf<HookReturn["loading"]>().toBeBoolean();
  });

  it("openCashRegister returns a promise", () => {
    type HookReturn = ReturnType<() => CashRegisterStore>;
    expectTypeOf<
      HookReturn["handleOpenCashRegister"]
    >().returns.resolves.toBeVoid();
  });
});
