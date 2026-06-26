/**
 * Characterization test for process-sale/route.ts extraction.
 *
 * Tests the public API boundary of each extracted module:
 * - processSaleValidation — data extraction, validation helpers (T-121)
 * - processPaymentUtils — payment computation, status logic (T-122)
 * - processResponseBuilder — response formatting helpers (T-123)
 *
 * Captures current behavior before/after extraction. No behavioral changes.
 */
import { describe, expect, it } from "vitest";

// ─── processSaleValidation (T-121) ───────────────────────────────────────────

import {
  extractFrameInfo,
  extractLensInfo,
  extractTreatmentsCost,
  extractLaborCost,
  computeOrderNumber,
  computeWorkOrderDecision,
  computeMinDepositFallback,
  isNonWorkOrderItem,
  haveOnlyNonWorkOrderProducts,
  hasLensDataForMounting,
} from "./processSaleValidation";

describe("processSaleValidation", () => {
  describe("extractFrameInfo", () => {
    it("should return defaults when no frame data and no items", () => {
      const result = extractFrameInfo(null, []);
      expect(result.frame_name).toBe("Marco");
      expect(result.frame_product_id).toBeNull();
      expect(result.frame_cost).toBe(0);
      expect(result.customer_own_frame).toBe(false);
    });

    it("should use structured frame_data when available", () => {
      const frameData = {
        frame_product_id: "prod-123",
        frame_name: "Ray-Ban Clubmaster",
        frame_brand: "Ray-Ban",
        frame_model: "RB3016",
        frame_color: "Black",
        frame_size: "53",
        frame_sku: "RB3016-53-BLK",
        customer_own_frame: false,
      };
      const result = extractFrameInfo(frameData, []);
      expect(result.frame_name).toBe("Ray-Ban Clubmaster");
      expect(result.frame_product_id).toBe("prod-123");
      expect(result.frame_brand).toBe("Ray-Ban");
    });

    it("should parse frame from items when frame_data is null", () => {
      const items = [
        {
          product_id: "frame-abc",
          product_name: "Marco Titanio",
          unit_price: 150000,
          quantity: 1,
        },
      ];
      const result = extractFrameInfo(null, items);
      expect(result.frame_name).toBe("Marco Titanio");
      expect(result.frame_cost).toBe(150000);
    });

    it("should reset frame_cost to 0 when frame_data is present (cost comes from items)", () => {
      const frameData = { frame_name: "Test Frame", frame_product_id: "p1" };
      const result = extractFrameInfo(frameData, []);
      expect(result.frame_cost).toBe(0);
    });

    it("should extract frame cost from items even with structured data", () => {
      const frameData = { frame_name: "Test Frame", frame_product_id: "p1" };
      const items = [
        {
          product_id: "frame-abc",
          product_name: "Marco Test",
          unit_price: 200000,
          quantity: 1,
        },
      ];
      const result = extractFrameInfo(frameData, items);
      expect(result.frame_cost).toBe(200000);
    });
  });

  describe("extractLensInfo", () => {
    it("should return defaults when no lens data and no items", () => {
      const result = extractLensInfo(null, []);
      expect(result.lens_type).toBe("single_vision");
      expect(result.lens_material).toBe("cr39");
      expect(result.lens_cost).toBe(0);
      expect(result.lens_treatments).toEqual([]);
    });

    it("should use structured lens_data when available", () => {
      const lensData = {
        lens_family_id: "lf-1",
        lens_type: "progressive",
        lens_material: "polycarbonate",
        lens_index: 1.67,
        lens_treatments: ["anti-reflective", "scratch-resistant"],
        prescription_id: "rx-1",
      };
      const result = extractLensInfo(lensData, []);
      expect(result.lens_family_id).toBe("lf-1");
      expect(result.lens_type).toBe("progressive");
      expect(result.lens_material).toBe("polycarbonate");
      expect(result.lens_index).toBe(1.67);
      expect(result.lens_treatments).toEqual([
        "anti-reflective",
        "scratch-resistant",
      ]);
    });

    it("should parse lens info from items when lens_data is null", () => {
      const items = [
        {
          product_id: "lens-1",
          product_name: "Lente progresivo cr39",
          unit_price: 80000,
          quantity: 1,
        },
      ];
      const result = extractLensInfo(null, items);
      expect(result.lens_cost).toBe(80000);
      expect(result.lens_type).toBe("progresivo");
      expect(result.lens_material).toBe("cr39");
    });

    it("should extract lens cost from items even with structured data", () => {
      const lensData = {
        lens_family_id: "lf-1",
        lens_type: "single_vision",
        lens_material: "cr39",
      };
      const items = [
        {
          product_id: "lens-1",
          product_name: "Lente",
          unit_price: 120000,
          quantity: 1,
        },
      ];
      const result = extractLensInfo(lensData, items);
      expect(result.lens_cost).toBe(120000);
    });
  });

  describe("extractTreatmentsCost", () => {
    it("should sum treatment item prices", () => {
      const items = [
        {
          product_id: "treatments-1",
          product_name: "Tratamiento: anti-reflective",
          unit_price: 15000,
          quantity: 1,
        },
        {
          product_id: "treatments-2",
          product_name: "Tratamiento: scratch-resistant",
          unit_price: 10000,
          quantity: 1,
        },
      ];
      expect(extractTreatmentsCost(items)).toBe(25000);
    });

    it("should return 0 when no treatment items", () => {
      const items = [
        {
          product_id: "frame-1",
          product_name: "Marco",
          unit_price: 50000,
          quantity: 1,
        },
      ];
      expect(extractTreatmentsCost(items)).toBe(0);
    });

    it("should detect treatments from Spanish product names", () => {
      const items = [
        {
          product_id: "tx-1",
          product_name: "tratamiento AR",
          unit_price: 20000,
          quantity: 1,
        },
      ];
      expect(extractTreatmentsCost(items)).toBe(20000);
    });
  });

  describe("extractLaborCost", () => {
    it("should sum labor item prices", () => {
      const items = [
        {
          product_id: "labor-1",
          product_name: "Mano de obra montaje",
          unit_price: 25000,
          quantity: 1,
        },
      ];
      expect(extractLaborCost(items)).toBe(25000);
    });

    it("should return 0 when no labor items", () => {
      const items = [
        {
          product_id: "frame-1",
          product_name: "Marco",
          unit_price: 50000,
          quantity: 1,
        },
      ];
      expect(extractLaborCost(items)).toBe(0);
    });
  });

  describe("computeOrderNumber", () => {
    it("should generate ORD-YYYYMMDD-0001 when no prior order", () => {
      const result = computeOrderNumber(null);
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      expect(result).toBe(`ORD-${today}-0001`);
    });

    it("should increment from last order number", () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const lastOrderNumber = `ORD-${today}-0003`;
      const result = computeOrderNumber(lastOrderNumber);
      expect(result).toBe(`ORD-${today}-0004`);
    });

    it("should start at 0001 if last number doesn't match expected format", () => {
      const result = computeOrderNumber("ORD-20240101-abc");
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      expect(result).toMatch(new RegExp(`^ORD-${today}-\\d{4}$`));
    });
  });

  describe("computeWorkOrderDecision", () => {
    it("should return true when temp lens items exist and has lens data", () => {
      const result = computeWorkOrderDecision({
        hasTemporaryLensItems: true,
        hasFrameInItems: true,
        hasLensDataForMounting: true,
        customerId: "c1",
        hasOnlyNonWorkOrderProducts: false,
      });
      expect(result).toBe(true);
    });

    it("should return false when only non-work-order products", () => {
      const result = computeWorkOrderDecision({
        hasTemporaryLensItems: false,
        hasFrameInItems: false,
        hasLensDataForMounting: false,
        customerId: null,
        hasOnlyNonWorkOrderProducts: true,
      });
      expect(result).toBe(false);
    });
  });

  describe("computeMinDepositFallback", () => {
    it("should return 50% of total amount", () => {
      expect(computeMinDepositFallback(100000)).toBe(50000);
      expect(computeMinDepositFallback(250000)).toBe(125000);
    });
  });

  describe("isNonWorkOrderItem", () => {
    it("should identify accessories as non-work-order", () => {
      expect(isNonWorkOrderItem("accessory")).toBe(true);
      expect(isNonWorkOrderItem("sunglasses")).toBe(true);
      expect(isNonWorkOrderItem("service")).toBe(true);
      expect(isNonWorkOrderItem("lens")).toBe(true);
    });

    it("should identify frames as work-order items", () => {
      expect(isNonWorkOrderItem("frame")).toBe(false);
    });
  });

  describe("haveOnlyNonWorkOrderProducts", () => {
    it("should return true when all types are non-work-order", () => {
      expect(haveOnlyNonWorkOrderProducts(["accessory", "sunglasses"])).toBe(
        true,
      );
    });

    it("should return false when frame is present", () => {
      expect(haveOnlyNonWorkOrderProducts(["frame", "accessory"])).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(haveOnlyNonWorkOrderProducts([])).toBe(false);
    });
  });

  describe("hasLensDataForMounting", () => {
    it("should return true with lens_family_id", () => {
      expect(
        hasLensDataForMounting({ lens_family_id: "lf-1" }, null, null, "none"),
      ).toBe(true);
    });

    it("should return true with contact lens data", () => {
      expect(hasLensDataForMounting(null, "cl-1", 50000, "none")).toBe(true);
    });

    it("should return false with no lens data", () => {
      expect(hasLensDataForMounting(null, null, null, "none")).toBe(false);
    });

    it("should return true with presbyopia solution", () => {
      expect(hasLensDataForMounting(null, null, null, "two_separate")).toBe(
        true,
      );
    });
  });
});

// ─── processPaymentUtils (T-122) ─────────────────────────────────────────────

import {
  computePaymentAmount,
  computeDbPaymentMethod,
  computeWorkOrderStatus,
  computeLensCost,
  computeCashAmount,
  buildOrderPaymentsPayload,
  buildStockReductionItems,
} from "./processPaymentUtils";

describe("processPaymentUtils", () => {
  describe("computePaymentAmount", () => {
    it("should return copago amount when agreement exists", () => {
      const result = computePaymentAmount({
        agreementId: "ag-1",
        copagoAmount: 25000,
        paymentsArray: [],
        depositAmount: null,
        cashReceived: null,
        totalAmount: 100000,
      });
      expect(result).toBe(25000);
    });

    it("should sum payments array when no agreement", () => {
      const result = computePaymentAmount({
        agreementId: null,
        copagoAmount: null,
        paymentsArray: [
          { amount: 30000, method: "cash" },
          { amount: 20000, method: "debit" },
        ],
        depositAmount: null,
        cashReceived: null,
        totalAmount: 100000,
      });
      expect(result).toBe(50000);
    });

    it("should fall back to deposit_amount or cash_received", () => {
      const result = computePaymentAmount({
        agreementId: null,
        copagoAmount: null,
        paymentsArray: [],
        depositAmount: 40000,
        cashReceived: null,
        totalAmount: 100000,
      });
      expect(result).toBe(40000);
    });

    it("should fall back to totalAmount when nothing else available", () => {
      const result = computePaymentAmount({
        agreementId: null,
        copagoAmount: null,
        paymentsArray: [],
        depositAmount: null,
        cashReceived: null,
        totalAmount: 100000,
      });
      expect(result).toBe(100000);
    });
  });

  describe("computeDbPaymentMethod", () => {
    it("should use PAYMENT_METHOD_MAP when agreement exists", () => {
      const result = computeDbPaymentMethod({
        agreementId: "ag-1",
        copagoAmount: 25000,
        paymentMethodType: "cash",
        paymentsArray: [],
      });
      expect(result).toBe("cash");
    });

    it("should use first payment method from array", () => {
      const result = computeDbPaymentMethod({
        agreementId: null,
        copagoAmount: null,
        paymentMethodType: "credit_card",
        paymentsArray: [{ amount: 50000, method: "debit" }],
      });
      expect(result).toBe("debit");
    });

    it("should fall back to payment_method_type via PAYMENT_METHOD_MAP", () => {
      const result = computeDbPaymentMethod({
        agreementId: null,
        copagoAmount: null,
        paymentMethodType: "credit_card",
        paymentsArray: [],
      });
      // PAYMENT_METHOD_MAP maps credit_card → "credit"
      expect(result).toBe("credit");
    });
  });

  describe("computeWorkOrderStatus", () => {
    it("should return on_hold_payment when payment is below min deposit", () => {
      const result = computeWorkOrderStatus(10000, 50000, 100000, 90000);
      expect(result).toEqual({
        status: "on_hold_payment",
        paymentStatus: "pending",
      });
    });

    it("should return ordered/paid when fully paid", () => {
      const result = computeWorkOrderStatus(100000, 50000, 100000, 0);
      expect(result).toEqual({ status: "ordered", paymentStatus: "paid" });
    });

    it("should return ordered/partial when paid enough but balance remains", () => {
      const result = computeWorkOrderStatus(75000, 50000, 100000, 25000);
      expect(result).toEqual({
        status: "ordered",
        paymentStatus: "partial",
      });
    });
  });

  describe("computeLensCost", () => {
    it("should sum far and near costs for two_separate", () => {
      expect(computeLensCost("two_separate", 60000, 40000, null, 50000)).toBe(
        100000,
      );
    });

    it("should use contact_lens_cost when two_separate is false", () => {
      expect(computeLensCost("none", null, null, 80000, 50000)).toBe(80000);
    });

    it("should fall back to lens_cost when neither contact nor separate", () => {
      expect(computeLensCost("none", null, null, null, 50000)).toBe(50000);
    });
  });

  describe("computeCashAmount", () => {
    it("should sum cash payments from array", () => {
      const payments = [
        { amount: 30000, method: "cash" },
        { amount: 20000, method: "debit" },
        { amount: 15000, method: "cash" },
      ];
      expect(computeCashAmount(payments, "credit_card", null, 100000)).toBe(
        45000,
      );
    });

    it("should use cash_received when no payments array", () => {
      expect(computeCashAmount([], "cash", 75000, 100000)).toBe(75000);
    });

    it("should fall back to total_amount when cash method but no received", () => {
      expect(computeCashAmount([], "cash", null, 100000)).toBe(100000);
    });

    it("should return 0 for non-cash method with no payments", () => {
      expect(computeCashAmount([], "debit", null, 100000)).toBe(0);
    });
  });

  describe("buildOrderPaymentsPayload", () => {
    it("should build copago payload for agreement sales", () => {
      const result = buildOrderPaymentsPayload({
        agreementId: "ag-1",
        copagoAmount: 25000,
        dbPaymentMethod: "cash",
        paymentsArray: [],
        paymentMethodType: "cash",
        fiscalReference: null,
        siiInvoiceNumber: "SII-001",
      });
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(25000);
      expect(result[0].notes).toContain("Copago convenio");
    });

    it("should build multi-payment payload", () => {
      const result = buildOrderPaymentsPayload({
        agreementId: null,
        copagoAmount: null,
        dbPaymentMethod: "cash",
        paymentsArray: [
          { amount: 50000, method: "cash" },
          { amount: 50000, method: "debit" },
        ],
        paymentMethodType: "split",
        fiscalReference: null,
        siiInvoiceNumber: null,
      });
      expect(result).toHaveLength(2);
      expect(result[1].notes).toContain("Pago 2/2");
    });

    it("should build single default payment", () => {
      const result = buildOrderPaymentsPayload({
        agreementId: null,
        copagoAmount: null,
        dbPaymentMethod: "cash",
        paymentsArray: [],
        paymentMethodType: "cash",
        fiscalReference: null,
        siiInvoiceNumber: null,
      });
      expect(result).toHaveLength(1);
      expect(result[0].notes).toContain("Pago inicial");
    });
  });

  describe("buildStockReductionItems", () => {
    it("should filter out temporary/lens/treatment/labor/discount items", () => {
      const items = [
        {
          product_id: "real-frame-1",
          product_name: "Marco",
          unit_price: 50000,
          quantity: 1,
        },
        {
          product_id: "lens-1",
          product_name: "Lente",
          unit_price: 80000,
          quantity: 1,
        },
        {
          product_id: "frame-manual-1",
          product_name: "Marco Manual",
          unit_price: 30000,
          quantity: 1,
        },
      ];
      const products = [
        { id: "real-frame-1", name: "Marco", product_type: "frame" },
      ];
      const result = buildStockReductionItems(items, products, "branch-1");
      expect(result).toHaveLength(1);
      expect(result[0].product_id).toBe("real-frame-1");
    });
  });
});

// ─── processResponseBuilder (T-123) ──────────────────────────────────────────

import {
  buildOrderItems,
  buildCustomerName,
  buildFullOrderResponse,
  buildWorkOrderResponse,
  buildBillingResponse,
  buildBillingOrder,
} from "./processResponseBuilder";

describe("processResponseBuilder", () => {
  describe("buildOrderItems", () => {
    it("should map items to order line format", () => {
      const items = [
        {
          product_id: "p1",
          product_name: "Product A",
          quantity: 2,
          unit_price: 5000,
        },
        {
          product_id: "p2",
          product_name: "Product B",
          quantity: 1,
          unit_price: 10000,
        },
      ];
      const result = buildOrderItems(items);
      expect(result).toHaveLength(2);
      expect(result[0].product_name).toBe("Product A");
      expect(result[0].total_price).toBe(10000);
      expect(result[0].id).toBe("item-0");
    });
  });

  describe("buildCustomerName", () => {
    it("should build name from registered customer", () => {
      const result = buildCustomerName({
        customer: {
          first_name: "John",
          last_name: "Doe",
          email: "john@test.com",
        },
        customerName: null,
        siiBusinessName: null,
        customerId: "c1",
      });
      expect(result).toEqual({
        customerName: "John Doe",
        billingFirstName: "John",
        billingLastName: "Doe",
      });
    });

    it("should handle unregistered customer with name", () => {
      const result = buildCustomerName({
        customer: null,
        customerName: "Jane Smith",
        siiBusinessName: null,
        customerId: null,
      });
      expect(result).toEqual({
        customerName: "Jane Smith",
        billingFirstName: "Jane",
        billingLastName: "Smith",
      });
    });

    it("should use SII business name when no customer name", () => {
      const result = buildCustomerName({
        customer: null,
        customerName: null,
        siiBusinessName: "Optica Chile SpA",
        customerId: null,
      });
      expect(result).toEqual({
        customerName: "Optica Chile SpA",
        billingFirstName: null,
        billingLastName: null,
      });
    });
  });

  describe("buildFullOrderResponse", () => {
    it("should assemble the full order response object", () => {
      const result = buildFullOrderResponse(
        {
          id: "ord-1",
          order_number: "ORD-001",
        },
        [],
        50000,
        "cash",
        "SII-001",
        "John Doe",
        "John",
        "Doe",
      );
      expect(result.order_number).toBe("ORD-001");
      expect(result.sii_invoice_number).toBe("SII-001");
      expect(result.customer_name).toBe("John Doe");
    });
  });

  describe("buildWorkOrderResponse", () => {
    it("should return null when workOrderId is falsy", () => {
      expect(buildWorkOrderResponse(null, "WO-001", "SII-001")).toBeNull();
    });

    it("should build work order response object", () => {
      const result = buildWorkOrderResponse("wo-1", "WO-001", "SII-001");
      expect(result).toEqual({
        id: "wo-1",
        work_order_number: "WO-001",
        sii_invoice_number: "SII-001",
      });
    });
  });

  describe("buildBillingResponse", () => {
    it("should return null when billingResult is null", () => {
      expect(buildBillingResponse(null)).toBeNull();
    });

    it("should build billing response object", () => {
      const result = buildBillingResponse({
        folio: "F-123",
        pdfUrl: "https://example.com/invoice.pdf",
        type: "electronic",
      });
      expect(result).toEqual({
        folio: "F-123",
        pdfUrl: "https://example.com/invoice.pdf",
        type: "electronic",
      });
    });
  });

  describe("buildBillingOrder", () => {
    it("should build billing order for registered customer", () => {
      const result = buildBillingOrder({
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "c1",
        branchId: "b1",
        totalAmount: 100000,
        subtotal: 85000,
        taxAmount: 15000,
        items: [],
        customer: {
          id: "c1",
          first_name: "John",
          last_name: "Doe",
          email: "j@t.com",
          rut: "11.111.111-1",
        },
        createdAt: "2024-01-15T10:00:00",
        ocNumber: null,
        purchaseOrderId: null,
        agreementId: null,
        customerName: null,
        email: null,
        customerRut: null,
        siiBusinessName: null,
      });
      expect(result.customer_id).toBe("c1");
      expect(result.customer.first_name).toBe("John");
    });

    it("should build billing order for unregistered customer", () => {
      const result = buildBillingOrder({
        orderId: "ord-2",
        orderNumber: "ORD-002",
        customerId: null,
        branchId: "b1",
        totalAmount: 50000,
        subtotal: 50000,
        taxAmount: 0,
        items: [],
        customer: null,
        createdAt: "2024-01-15T11:00:00",
        ocNumber: "OC-001",
        purchaseOrderId: "po-1",
        agreementId: "ag-1",
        customerName: "Jane Doe",
        email: "jane@test.com",
        customerRut: "22.222.222-2",
        siiBusinessName: null,
      });
      expect(result.customer.first_name).toBe("Jane");
      expect(result.oc_number).toBe("OC-001");
    });
  });
});
