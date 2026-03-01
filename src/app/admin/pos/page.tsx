"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  User,
  X,
  Check,
  Loader2,
  ShoppingCart,
  Calculator,
  Printer,
  AlertCircle,
  FileText,
  CheckCircle2,
  Eye,
  Package,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Wallet,
  Send,
  Download,
} from "lucide-react";
import { POSReceipt } from "@/components/admin/POS/POSReceipt";
import { toast } from "sonner";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  formatRUT,
  completeRUTIfNeeded,
  isValidRUTFormat,
  normalizeRUT,
} from "@/lib/utils/rut";
import {
  calculateSubtotal,
  calculateTotalTax,
  calculateTotal,
} from "@/lib/utils/tax";
import { getTaxPercentage } from "@/lib/utils/tax-config";
import { formatCurrency, formatDate, formatPrice } from "@/lib/utils";
import { getTodayInTimezone } from "@/lib/utils/date-timezone";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import {
  posService,
  quoteService,
  customerService,
  productService,
  quoteSettingsService,
  lensFamilyService,
  contactLensFamilyService,
  contactLensMatrixService,
} from "@/lib/api/services";
import { LensFamilyCombobox } from "@/components/admin/lenses/LensFamilyCombobox";
import { ContactLensFamilyCombobox } from "@/components/admin/lenses/ContactLensFamilyCombobox";
import type { QuoteSearchParams } from "@/lib/api/services";
import { useBranch } from "@/hooks/useBranch";
import { usePosInsightsRefresh } from "@/hooks/usePosInsightsRefresh";
import { getBranchHeader } from "@/lib/utils/branch";
import { useLensPriceCalculation } from "@/hooks/useLensPriceCalculation";
import {
  hasAddition,
  getMaxAddition,
  getFarSphere,
  getCylinder,
  getNearSphere,
  getDefaultPresbyopiaSolution,
  getRecommendedLensTypes,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  POSCart,
  POSRefundDialog,
  POSBarcodeInput,
  POSPendingBalanceDialog,
} from "./components";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  price: number;
  price_includes_tax?: boolean;
  inventory_quantity: number;
  sku?: string;
  barcode?: string;
  featured_image?: string;
  brand?: string;
  product_type?: string; // frame, accessory, sunglasses, service, lens, etc.
  category?: {
    id: string;
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  priceIncludesTax: boolean;
}

interface Customer {
  id: string;
  email?: string | null;
  first_name?: string;
  last_name?: string;
  name?: string;
  rut?: string | null | undefined;
  business_name?: string;
  address?: string;
  phone?: string | null;
}

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  frame_name?: string;
  frame_product_id?: string;
  frame_price?: number;
  frame_sku?: string;
  lens_type?: string;
  lens_material?: string;
  lens_cost?: number;
  lens_treatments?: string[];
  treatments_cost?: number;
  labor_cost?: number;
}

type PaymentMethod = "cash" | "debit_card" | "credit_card" | "transfer";

export default function POSPage() {
  const searchParams = useSearchParams();
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0); // Monto de abono para pagos parciales
  const [isCashPartial, setIsCashPartial] = useState<boolean>(false); // Para efectivo parcial
  const [cashPartialAmount, setCashPartialAmount] = useState<number>(0); // Monto parcial para efectivo
  const [isCashOpen, setIsCashOpen] = useState<boolean | null>(null);
  const [checkingCashStatus, setCheckingCashStatus] = useState(true);
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [lastProcessedOrder, setLastProcessedOrder] = useState<any>(null);
  const [siiInvoiceType, setSiiInvoiceType] = useState<
    "boleta" | "factura" | "none"
  >("boleta");
  const [customerRUT, setCustomerRUT] = useState<string>("");
  const [customerBusinessName, setCustomerBusinessName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [mobilePaymentDrawerOpen, setMobilePaymentDrawerOpen] = useState(false);
  const [showPendingBalanceDialog, setShowPendingBalanceDialog] =
    useState(false);
  const [pendingBalanceOrders, setPendingBalanceOrders] = useState<any[]>([]);
  const [allPendingBalanceOrders, setAllPendingBalanceOrders] = useState<any[]>(
    [],
  );
  const [loadingPendingBalance, setLoadingPendingBalance] = useState(false);
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<any>(null);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState<string>("");
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState("cash");
  const [processingPendingPayment, setProcessingPendingPayment] =
    useState(false);
  const [pendingBalanceSearchTerm, setPendingBalanceSearchTerm] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundOrderNumber, setRefundOrderNumber] = useState<string>("");
  const [fiscalReference, setFiscalReference] = useState<string>("");
  const [pendingFiscalReference, setPendingFiscalReference] =
    useState<string>("");
  const [receiptType, setReceiptType] = useState<"sale" | "payment">("sale");
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Customer search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<
    Customer[]
  >([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] =
    useState<number>(-1);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const customerSuggestionsRef = useRef<HTMLDivElement>(null);
  const quoteLoadingRef = useRef<boolean>(false); // Prevent infinite loop when loading quote from URL

  // Quote loading states
  const [customerQuotes, setCustomerQuotes] = useState<Quote[]>([]);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Complete order form states
  const [quoteSettings, setQuoteSettings] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [frameSearch, setFrameSearch] = useState("");
  const [frameResults, setFrameResults] = useState<any[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<any>(null);
  const [searchingFrames, setSearchingFrames] = useState(false);
  const [customerOwnFrame, setCustomerOwnFrame] = useState<boolean>(false);

  // Second frame for two separate lenses (near vision)
  const [nearFrameSearch, setNearFrameSearch] = useState("");
  const [nearFrameResults, setNearFrameResults] = useState<any[]>([]);
  const [selectedNearFrame, setSelectedNearFrame] = useState<any>(null);
  const [searchingNearFrames, setSearchingNearFrames] = useState(false);
  const [customerOwnNearFrame, setCustomerOwnNearFrame] =
    useState<boolean>(false);

  const [manualLensPrice, setManualLensPrice] = useState<boolean>(false);

  // POS insights: refresh when prescription or customer changes (for contextual recommendations)
  usePosInsightsRefresh(selectedPrescription, selectedCustomer, {
    debounceMs: 2000,
    enabled: !!(selectedPrescription || selectedCustomer),
  });

  // Lens families and price calculation
  const [lensFamilies, setLensFamilies] = useState<any[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  // Contact lens families and price calculation
  const [contactLensFamilies, setContactLensFamilies] = useState<any[]>([]);
  const [loadingContactLensFamilies, setLoadingContactLensFamilies] =
    useState(false);
  const [lensType, setLensType] = useState<"optical" | "contact">("optical"); // Toggle between optical and contact lenses
  const [calculatingContactLensPrice, setCalculatingContactLensPrice] =
    useState(false);

  // Presbyopia solution
  const [presbyopiaSolution, setPresbyopiaSolution] =
    useState<PresbyopiaSolution>("none");
  const [farLensFamilyId, setFarLensFamilyId] = useState<string>("");
  const [nearLensFamilyId, setNearLensFamilyId] = useState<string>("");
  const [farLensCost, setFarLensCost] = useState<number>(0);
  const [nearLensCost, setNearLensCost] = useState<number>(0);

  // Discount type state
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "amount",
  );

  // External customer and prescription states (for walk-in customers with external prescription)
  const [showExternalPrescriptionDialog, setShowExternalPrescriptionDialog] =
    useState(false);
  const [creatingExternalCustomer, setCreatingExternalCustomer] =
    useState(false);
  const [externalCustomerData, setExternalCustomerData] = useState({
    first_name: "",
    last_name: "",
    rut: "",
    phone: "",
    email: "",
  });
  const [externalPrescriptionData, setExternalPrescriptionData] = useState({
    prescription_date: getTodayInTimezone("America/Santiago"),
    expiration_date: "",
    prescription_number: "",
    issued_by: "",
    issued_by_license: "",
    od_sphere: "",
    od_cylinder: "",
    od_axis: "",
    od_add: "",
    os_sphere: "",
    os_cylinder: "",
    os_axis: "",
    os_add: "",
    pd: "",
    near_pd: "",
    frame_pd: "",
    height_segmentation: "",
  });

  // Import lens price calculation hook
  const { calculateLensPrice, loading: calculatingPrice } =
    useLensPriceCalculation();

  const [orderFormData, setOrderFormData] = useState({
    frame_name: "",
    frame_brand: "",
    frame_model: "",
    frame_color: "",
    frame_size: "",
    frame_sku: "",
    frame_price: 0,
    lens_family_id: "" as string | "",
    lens_type: "",
    lens_material: "",
    lens_index: null as number | null,
    lens_treatments: [] as string[],
    lens_tint_color: "",
    lens_tint_percentage: 0,
    presbyopia_solution: "none" as PresbyopiaSolution,
    far_lens_family_id: "",
    near_lens_family_id: "",
    far_lens_cost: 0,
    near_lens_cost: 0,
    // Contact lens fields
    contact_lens_family_id: "",
    contact_lens_rx_sphere_od: null as number | null,
    contact_lens_rx_cylinder_od: null as number | null,
    contact_lens_rx_axis_od: null as number | null,
    contact_lens_rx_add_od: null as number | null,
    contact_lens_rx_base_curve_od: null as number | null,
    contact_lens_rx_diameter_od: null as number | null,
    contact_lens_rx_sphere_os: null as number | null,
    contact_lens_rx_cylinder_os: null as number | null,
    contact_lens_rx_axis_os: null as number | null,
    contact_lens_rx_add_os: null as number | null,
    contact_lens_rx_base_curve_os: null as number | null,
    contact_lens_rx_diameter_os: null as number | null,
    contact_lens_quantity: 1,
    contact_lens_cost: 0,
    contact_lens_price: 0,
    // Second frame for two separate lenses (near vision)
    near_frame_product_id: "",
    near_frame_name: "",
    near_frame_brand: "",
    near_frame_model: "",
    near_frame_color: "",
    near_frame_size: "",
    near_frame_sku: "",
    near_frame_price: 0,
    near_frame_price_includes_tax: false,
    near_frame_cost: 0,
    customer_own_near_frame: false,
    frame_cost: 0,
    lens_cost: 0,
    treatments_cost: 0,
    labor_cost: 0,
    discount_percentage: 0,
    discount_amount: 0,
  });

  const printRef = useRef<HTMLDivElement>(null);
  const printReceipt = (retryCount = 0) => {
    const el = printRef.current;
    if (!lastProcessedOrder) {
      window.print();
      return;
    }
    if (!el || !el.innerHTML?.trim()) {
      if (retryCount < 1) {
        setTimeout(() => printReceipt(retryCount + 1), 200);
        return;
      }
      window.print();
      return;
    }
    const html = el.innerHTML;
    const w = window.open("", "_blank");
    if (!w) {
      window.print();
      return;
    }
    w.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Boleta</title>
          <style>
            body { margin: 0; padding: 16px; font-family: monospace; font-size: 12px; color: #000; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .border-top { border-top: 1px solid #000; }
            .border-bottom { border-bottom: 1px solid #000; }
            @media print {
              html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; }
              body { page-break-after: avoid; }
              @page { size: auto; margin: 10mm; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>`);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
      w.close();
    };
  };

  // Tab activo del formulario "Crear orden completa" (para abrir Lentes al cargar presupuesto de lentes de contacto)
  const [orderFormTab, setOrderFormTab] = useState("customer");
  const [mainSectionTab, setMainSectionTab] = useState<
    "cliente" | "productos" | "orden"
  >("cliente");

  // Tax percentage state
  const [taxPercentage, setTaxPercentage] = useState<number>(19.0);

  // Fetch tax percentage on mount
  useEffect(() => {
    getTaxPercentage(19.0).then(setTaxPercentage);
  }, []);

  // Load quote from URL parameter (when coming from "Cargar al POS" button)
  useEffect(() => {
    const quoteId = searchParams?.get("quoteId");
    if (
      quoteId &&
      cart.length === 0 &&
      !selectedQuote &&
      !quoteLoadingRef.current
    ) {
      // Prevent infinite loop by setting loading flag
      quoteLoadingRef.current = true;

      // Load quote to form instead of directly to cart
      // This allows editing before adding to cart
      const loadQuoteFromUrl = async () => {
        try {
          // Fetch full quote details using quoteService
          const fullQuote = await quoteService.getQuote(quoteId);

          // Set selected quote immediately to prevent re-triggering the effect
          setSelectedQuote(fullQuote);

          // Clear the quoteId from URL immediately to prevent re-loading
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("quoteId");
          window.history.replaceState({}, "", newUrl.toString());

          // Load quote to form (this will load all data correctly including customer)
          await handleLoadQuoteToForm(fullQuote);
        } catch (error: any) {
          console.error("Error loading quote from URL:", error);
          toast.error(error.message || "Error al cargar el presupuesto");
          quoteLoadingRef.current = false; // Reset flag on error
        }
      };

      loadQuoteFromUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentBranchId]);

  // Calculate totals with tax consideration
  const itemsForTaxCalculation = cart.map((item) => ({
    price: item.unitPrice * item.quantity, // Total price for the quantity
    includesTax: item.priceIncludesTax,
  }));

  const subtotal = calculateSubtotal(itemsForTaxCalculation, taxPercentage);
  const taxAmount = calculateTotalTax(itemsForTaxCalculation, taxPercentage);
  const total = calculateTotal(itemsForTaxCalculation, taxPercentage);
  const change = isCashPartial ? 0 : cashReceived - total; // No change for partial payments

  // Check cash register status
  useEffect(() => {
    if (!currentBranchId && !isSuperAdmin) return;
    checkCashStatus();
    const interval = setInterval(checkCashStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [currentBranchId, isSuperAdmin]);

  const checkCashStatus = async () => {
    if (!currentBranchId && !isSuperAdmin) {
      setIsCashOpen(null);
      setCheckingCashStatus(false);
      return;
    }

    setCheckingCashStatus(true);
    try {
      // Use posService for cash status
      const cashStatus = await posService.getCashStatus(
        currentBranchId || undefined,
      );
      if (cashStatus) {
        setIsCashOpen(cashStatus.isOpen);
      }
    } catch (error: any) {
      console.error("Error checking cash status:", error);
    } finally {
      setCheckingCashStatus(false);
    }
  };

  // Fetch billing settings and organization info
  useEffect(() => {
    const fetchData = async () => {
      if (!currentBranchId && !isSuperAdmin) return;

      try {
        // Fetch Billing settings using posService
        const billingSettings = await posService.getBillingSettings(
          currentBranchId || undefined,
        );
        if (billingSettings) setBillingSettings(billingSettings);

        // Fetch Organization info using posService
        const organization = await posService.getCurrentOrganization(
          currentBranchId || undefined,
        );
        if (organization) setOrganization(organization);
      } catch (error) {
        console.error("Error fetching POS prerequisites:", error);
      }
    };

    fetchData();
  }, [currentBranchId, isSuperAdmin]);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Search customers - intelligent search from 1 character
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearchTerm.trim().length === 0) {
        setCustomerSearchResults([]);
        setSelectedCustomerIndex(-1);
        setSearchingCustomers(false);
        return;
      }

      setSearchingCustomers(true);
      try {
        console.log("🔍 POS: Searching customers:", customerSearchTerm);

        // Use getCustomers with search param
        const result = await customerService.getCustomers({
          search: customerSearchTerm,
          limit: 10,
          branchId: currentBranchId || undefined,
        });

        console.log("📦 POS: Search response:", {
          customersCount: result?.data?.length || 0,
        });

        if (result?.data) {
          const customers = result.data.map((c: any) => ({
            ...c,
            name:
              `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
              c.email ||
              "Sin nombre",
          }));
          console.log("✅ POS: Found customers:", customers.length);
          setCustomerSearchResults(customers);
          setSelectedCustomerIndex(-1);
        } else {
          console.error("❌ POS: Search failed");
          toast.error("Error al buscar clientes");
          setCustomerSearchResults([]);
        }
      } catch (error: any) {
        console.error("❌ POS: Error searching customers:", error);
        toast.error("Error al buscar clientes");
        setCustomerSearchResults([]);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 200);
    return () => clearTimeout(debounce);
  }, [customerSearchTerm, currentBranchId]);

  // Fetch customer quotes when customer is selected.
  // Pass customerRut so the API returns quotes for ALL customer rows with that RUT in the org
  // (same person can have different customer records per branch).
  const fetchCustomerQuotes = async (
    customerId: string,
    skipAutoLoad: boolean = false,
    customerRut?: string | null,
    customerEmail?: string | null,
  ) => {
    setLoadingQuotes(true);
    try {
      const params = new URLSearchParams({
        customer_id: customerId,
        status: "all",
        limit: "10",
      });
      if (customerRut && customerRut.trim()) {
        params.set("customer_rut", customerRut.trim());
      }
      if (customerEmail && customerEmail.trim()) {
        params.set("customer_email", customerEmail.trim());
      }
      console.log("📋 POS: Fetching customer quotes:", {
        customerId,
        customerRut: customerRut || null,
        customerEmail: customerEmail || null,
      });

      // Build search params for quoteService.getQuotes
      const searchParams: QuoteSearchParams = {
        customer_id: customerId,
        limit: 50,
      };

      // Add optional filters
      if (customerRut) searchParams.search = customerRut;
      if (customerEmail) searchParams.search = customerEmail.trim();

      const quotesResponse = await quoteService.getQuotes(searchParams);
      const allQuotes = quotesResponse.data || [];

      console.log("✅ POS: Quotes response:", {
        count: allQuotes.length,
      });
      setCustomerQuotes(allQuotes);
    } catch (error) {
      console.error("Error fetching customer quotes:", error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Load quote data into the form (not cart)
  const handleLoadQuoteToForm = async (quote: Quote) => {
    try {
      // Fetch full quote details using quoteService
      const quoteResult = await quoteService.getQuote(quote.id);
      // Cast to any to handle additional nested properties from API response
      const fullQuote = quoteResult as unknown as any;

      console.log("📋 Loading quote to form:", fullQuote);

      // Set customer first (important for proper data loading)
      if (fullQuote.customer_id && fullQuote.customer) {
        const customer = {
          id: fullQuote.customer_id,
          ...fullQuote.customer,
          name:
            fullQuote.customer.first_name && fullQuote.customer.last_name
              ? `${fullQuote.customer.first_name} ${fullQuote.customer.last_name}`
              : fullQuote.customer.email || "Sin nombre",
        };
        setSelectedCustomer(customer);

        // Format RUT if it exists
        if (customer.rut) {
          const formattedRUT = formatRUT(customer.rut);
          setCustomerRUT(formattedRUT);
        }
        setCustomerBusinessName(customer.business_name || "");

        // Fetch customer quotes (by RUT for cross-branch) and prescriptions for the dropdown
        await fetchCustomerPrescriptions(fullQuote.customer_id);
        await fetchCustomerQuotes(
          fullQuote.customer_id,
          true,
          fullQuote.customer?.rut ?? undefined,
          fullQuote.customer?.email ?? undefined,
        );
      }

      // Set selected quote (if not already set - may be set by URL loader)
      if (!selectedQuote || selectedQuote.id !== fullQuote.id) {
        setSelectedQuote(fullQuote);
      }

      // Reset frame selection first
      setSelectedFrame(null);

      // Load frame data - try to fetch product if frame_product_id exists
      if (fullQuote.frame_product_id) {
        try {
          const productResult = await productService.getProduct(
            fullQuote.frame_product_id,
          );
          setSelectedFrame(productResult as unknown as any);
          console.log("✅ Frame product loaded:", productResult);
        } catch (error) {
          console.error("Error fetching frame product:", error);
          console.log("⚠️ Frame product not found, using manual frame data");
        }
      }

      // Detectar si es presupuesto de lentes de contacto para setear lensType
      const isContactLensQuote =
        fullQuote.lens_type === "Lentes de contacto" ||
        !!fullQuote.contact_lens_family_id;

      if (isContactLensQuote) {
        setLensType("contact");
        setOrderFormTab("lenses"); // Abrir tab Lentes para que se vean los datos de lentes de contacto
      }

      // Load form data from quote - ensure all values are loaded (incl. contact lens)
      const formData = {
        frame_name: fullQuote.frame_name || "",
        frame_brand: fullQuote.frame_brand || "",
        frame_model: fullQuote.frame_model || "",
        frame_color: fullQuote.frame_color || "",
        frame_size: fullQuote.frame_size || "",
        frame_sku: fullQuote.frame_sku || "",
        frame_price: fullQuote.frame_price || 0,
        lens_family_id: fullQuote.lens_family_id || "",
        lens_type: fullQuote.lens_type || "",
        lens_material: fullQuote.lens_material || "",
        lens_index: fullQuote.lens_index || null,
        lens_treatments: Array.isArray(fullQuote.lens_treatments)
          ? fullQuote.lens_treatments
          : [],
        lens_tint_color: fullQuote.lens_tint_color || "",
        lens_tint_percentage: fullQuote.lens_tint_percentage || 0,
        presbyopia_solution: (fullQuote.presbyopia_solution ||
          "none") as PresbyopiaSolution,
        far_lens_family_id: fullQuote.far_lens_family_id || "",
        near_lens_family_id: fullQuote.near_lens_family_id || "",
        far_lens_cost: fullQuote.far_lens_cost || 0,
        near_lens_cost: fullQuote.near_lens_cost || 0,
        // Contact lens fields (from quote)
        contact_lens_family_id: fullQuote.contact_lens_family_id || "",
        contact_lens_rx_sphere_od: fullQuote.contact_lens_rx_sphere_od ?? null,
        contact_lens_rx_cylinder_od:
          fullQuote.contact_lens_rx_cylinder_od ?? null,
        contact_lens_rx_axis_od: fullQuote.contact_lens_rx_axis_od ?? null,
        contact_lens_rx_add_od: fullQuote.contact_lens_rx_add_od ?? null,
        contact_lens_rx_base_curve_od:
          fullQuote.contact_lens_rx_base_curve_od ?? null,
        contact_lens_rx_diameter_od:
          fullQuote.contact_lens_rx_diameter_od ?? null,
        contact_lens_rx_sphere_os: fullQuote.contact_lens_rx_sphere_os ?? null,
        contact_lens_rx_cylinder_os:
          fullQuote.contact_lens_rx_cylinder_os ?? null,
        contact_lens_rx_axis_os: fullQuote.contact_lens_rx_axis_os ?? null,
        contact_lens_rx_add_os: fullQuote.contact_lens_rx_add_os ?? null,
        contact_lens_rx_base_curve_os:
          fullQuote.contact_lens_rx_base_curve_os ?? null,
        contact_lens_rx_diameter_os:
          fullQuote.contact_lens_rx_diameter_os ?? null,
        contact_lens_quantity: fullQuote.contact_lens_quantity ?? 1,
        contact_lens_cost: fullQuote.contact_lens_cost ?? 0,
        contact_lens_price: fullQuote.contact_lens_price ?? 0,
        // Second frame for two separate lenses
        near_frame_product_id: fullQuote.near_frame_product_id || "",
        near_frame_name: fullQuote.near_frame_name || "",
        near_frame_brand: fullQuote.near_frame_brand || "",
        near_frame_model: fullQuote.near_frame_model || "",
        near_frame_color: fullQuote.near_frame_color || "",
        near_frame_size: fullQuote.near_frame_size || "",
        near_frame_sku: fullQuote.near_frame_sku || "",
        near_frame_price: fullQuote.near_frame_price || 0,
        near_frame_price_includes_tax:
          fullQuote.near_frame_price_includes_tax || false,
        near_frame_cost: fullQuote.near_frame_cost || 0,
        customer_own_near_frame: fullQuote.customer_own_near_frame || false,
        frame_cost: fullQuote.frame_cost || 0,
        lens_cost: fullQuote.lens_cost || 0,
        treatments_cost: fullQuote.treatments_cost || 0,
        labor_cost: fullQuote.labor_cost || 0,
        discount_percentage: fullQuote.discount_percentage || 0,
        discount_amount: fullQuote.discount_amount || 0,
      };

      // Determine discount type based on quote values
      // If both have values, prefer the one that makes more sense
      // If discount_amount > 0, use 'amount', otherwise use 'percentage'
      if (fullQuote.discount_amount && fullQuote.discount_amount > 0) {
        setDiscountType("amount");
      } else if (
        fullQuote.discount_percentage &&
        fullQuote.discount_percentage > 0
      ) {
        setDiscountType("percentage");
      } else {
        setDiscountType("amount"); // Default
      }

      // Set customer_own_frame from quote
      setCustomerOwnFrame(fullQuote.customer_own_frame || false);
      setCustomerOwnNearFrame(fullQuote.customer_own_near_frame || false);

      // Set presbyopia solution state
      const solution = (fullQuote.presbyopia_solution ||
        "none") as PresbyopiaSolution;
      setPresbyopiaSolution(solution);

      // Set lens family IDs for two_separate
      if (solution === "two_separate") {
        setFarLensFamilyId(fullQuote.far_lens_family_id || "");
        setNearLensFamilyId(fullQuote.near_lens_family_id || "");
        setFarLensCost(fullQuote.far_lens_cost || 0);
        setNearLensCost(fullQuote.near_lens_cost || 0);

        // Load near frame data if exists
        if (fullQuote.near_frame_product_id) {
          try {
            const nearFrameResult = await productService.getProduct(
              fullQuote.near_frame_product_id,
            );
            setSelectedNearFrame(nearFrameResult as unknown as any);
            console.log("✅ Near frame product loaded:", nearFrameResult);
          } catch (error) {
            console.error("Error fetching near frame product:", error);
          }
        }
      }

      console.log("📝 Form data loaded:", formData);
      console.log("👓 Presbyopia solution:", solution);
      console.log("🔍 Far lens family:", fullQuote.far_lens_family_id);
      console.log("🔍 Near lens family:", fullQuote.near_lens_family_id);

      setOrderFormData(formData);

      // If frame_price is set but no frame product, ensure we can still add it manually
      if (formData.frame_price > 0 && !fullQuote.frame_product_id) {
        console.log("📦 Manual frame detected (no product_id)");
      }

      // Load prescription: usar la receta embebida del presupuesto si existe; si no, buscar en prescriptions tras cargar
      if (fullQuote.prescription) {
        setSelectedPrescription(fullQuote.prescription);
      } else if (fullQuote.prescription_id) {
        setTimeout(() => {
          const prescription = prescriptions.find(
            (p) => p.id === fullQuote.prescription_id,
          );
          if (prescription) {
            setSelectedPrescription(prescription);
          }
        }, 500);
      }

      toast.success(
        `Presupuesto ${fullQuote.quote_number} cargado en el formulario. Puedes editarlo antes de agregar al carrito.`,
      );
    } catch (error: any) {
      console.error("Error loading quote to form:", error);
      toast.error(error.message || "Error al cargar el presupuesto");
    }
  };

  // Search products - now searches from 1 character
  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm.trim().length === 0) {
        setProducts([]);
        setSelectedProductIndex(-1);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const products = await productService.searchProducts(searchTerm);
        // Filter out products with category "Marcos" (frames should be added via "Crear Orden Completa")
        const filteredProducts = (products as unknown as any[]).filter(
          (product: any) =>
            product.category?.name?.toLowerCase() !== "marcos" &&
            product.category?.name?.toLowerCase() !== "marco",
        );
        setProducts(filteredProducts as unknown as Product[]);
        setSelectedProductIndex(-1); // Reset selection when new results arrive
      } catch (error) {
        console.error("Error searching products:", error);
        setProducts([]);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 200); // Reduced debounce for faster response
    return () => clearTimeout(debounce);
  }, [searchTerm, currentBranchId]);

  // Handle keyboard navigation in search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedProductIndex >= 0 && products[selectedProductIndex]) {
        addToCart(products[selectedProductIndex]);
      } else if (products.length > 0) {
        addToCart(products[0]);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedProductIndex((prev) =>
        prev < products.length - 1 ? prev + 1 : prev,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedProductIndex((prev) => (prev > 0 ? prev - 1 : -1));
      return;
    }

    if (e.key === "Escape") {
      setProducts([]);
      setSearchTerm("");
      setSelectedProductIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  // Scroll selected product into view
  useEffect(() => {
    if (selectedProductIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[
        selectedProductIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedProductIndex]);

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    setSearching(true);
    try {
      const results = await productService.searchProducts(barcode);
      const filtered = (results as unknown as any[]).filter(
        (p: any) =>
          p.category?.name?.toLowerCase() !== "marcos" &&
          p.category?.name?.toLowerCase() !== "marco",
      );
      if (filtered.length > 0) {
        addToCart(filtered[0] as Product);
        setSearchTerm("");
        toast.success(`Agregado: ${(filtered[0] as any).name}`);
      } else {
        toast.error("No se encontró producto con ese código");
      }
    } catch (err) {
      toast.error("Error al buscar producto");
    } finally {
      setSearching(false);
      searchInputRef.current?.focus();
    }
  };

  const addToCart = (product: Product) => {
    // Debug: Log product being added
    console.log("🛒 Adding product to cart:", {
      id: product.id,
      name: product.name,
      product_type: (product as any)?.product_type,
      category: (product as any)?.category?.name,
    });

    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      updateCartQuantity(existingItem.product.id, existingItem.quantity + 1);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
          // Default to true (IVA incluido) if not specified - typical in Chile
          priceIncludesTax: product.price_includes_tax ?? true,
        },
      ]);
    }

    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: item.unitPrice * quantity,
            }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived(0);
    setSelectedCustomer(null);
    setCustomerRUT("");
    setCustomerBusinessName("");
    setSiiInvoiceType("boleta");
    setCustomerQuotes([]);
    setCustomerSearchTerm("");
    setCustomerSearchResults([]);
    setSelectedPrescription(null);
    setPrescriptions([]);
    setSelectedFrame(null);
    setFrameSearch("");
    setFrameResults([]);
    setSelectedNearFrame(null);
    setNearFrameSearch("");
    setNearFrameResults([]);
    setSelectedQuote(null);
    setCustomerOwnFrame(false);
    setCustomerOwnNearFrame(false);
    setManualLensPrice(false);
    setPresbyopiaSolution("none");
    setFarLensFamilyId("");
    setNearLensFamilyId("");
    setFarLensCost(0);
    setNearLensCost(0);
    setOrderFormData({
      frame_name: "",
      frame_brand: "",
      frame_model: "",
      frame_color: "",
      frame_size: "",
      frame_sku: "",
      frame_price: 0,
      lens_family_id: "",
      lens_type: "",
      lens_material: "",
      lens_index: null,
      lens_treatments: [],
      lens_tint_color: "",
      lens_tint_percentage: 0,
      presbyopia_solution: "none" as PresbyopiaSolution,
      far_lens_family_id: "",
      near_lens_family_id: "",
      far_lens_cost: 0,
      near_lens_cost: 0,
      // Contact lens fields
      contact_lens_family_id: "",
      contact_lens_rx_sphere_od: null,
      contact_lens_rx_cylinder_od: null,
      contact_lens_rx_axis_od: null,
      contact_lens_rx_add_od: null,
      contact_lens_rx_base_curve_od: null,
      contact_lens_rx_diameter_od: null,
      contact_lens_rx_sphere_os: null,
      contact_lens_rx_cylinder_os: null,
      contact_lens_rx_axis_os: null,
      contact_lens_rx_add_os: null,
      contact_lens_rx_base_curve_os: null,
      contact_lens_rx_diameter_os: null,
      contact_lens_quantity: 1,
      contact_lens_cost: 0,
      contact_lens_price: 0,
      // Second frame for two separate lenses (near vision)
      near_frame_product_id: "",
      near_frame_name: "",
      near_frame_brand: "",
      near_frame_model: "",
      near_frame_color: "",
      near_frame_size: "",
      near_frame_sku: "",
      near_frame_price: 0,
      near_frame_price_includes_tax: false,
      near_frame_cost: 0,
      customer_own_near_frame: false,
      frame_cost: 0,
      lens_cost: 0,
      treatments_cost: 0,
      labor_cost: quoteSettings?.default_labor_cost ?? 15000,
      discount_percentage: 0,
      discount_amount: 0,
    });
    setDiscountType("amount"); // Reset to default
  };

  const resetCompleteOrderForm = () => {
    setSelectedQuote(null);
    setSelectedFrame(null);
    setSelectedNearFrame(null);
    setNearFrameSearch("");
    setNearFrameResults([]);
    setCustomerOwnFrame(false);
    setCustomerOwnNearFrame(false);
    setManualLensPrice(false);
    setPresbyopiaSolution("none");
    setFarLensFamilyId("");
    setNearLensFamilyId("");
    setFarLensCost(0);
    setNearLensCost(0);
    setOrderFormData({
      frame_name: "",
      frame_brand: "",
      frame_model: "",
      frame_color: "",
      frame_size: "",
      frame_sku: "",
      frame_price: 0,
      lens_family_id: "",
      lens_type: "",
      lens_material: "",
      lens_index: null,
      lens_treatments: [],
      lens_tint_color: "",
      lens_tint_percentage: 0,
      presbyopia_solution: "none" as PresbyopiaSolution,
      far_lens_family_id: "",
      near_lens_family_id: "",
      far_lens_cost: 0,
      near_lens_cost: 0,
      contact_lens_family_id: "",
      contact_lens_rx_sphere_od: null,
      contact_lens_rx_cylinder_od: null,
      contact_lens_rx_axis_od: null,
      contact_lens_rx_add_od: null,
      contact_lens_rx_base_curve_od: null,
      contact_lens_rx_diameter_od: null,
      contact_lens_rx_sphere_os: null,
      contact_lens_rx_cylinder_os: null,
      contact_lens_rx_axis_os: null,
      contact_lens_rx_add_os: null,
      contact_lens_rx_base_curve_os: null,
      contact_lens_rx_diameter_os: null,
      contact_lens_quantity: 1,
      contact_lens_cost: 0,
      contact_lens_price: 0,
      near_frame_product_id: "",
      near_frame_name: "",
      near_frame_brand: "",
      near_frame_model: "",
      near_frame_color: "",
      near_frame_size: "",
      near_frame_sku: "",
      near_frame_price: 0,
      near_frame_price_includes_tax: false,
      near_frame_cost: 0,
      customer_own_near_frame: false,
      frame_cost: 0,
      lens_cost: 0,
      treatments_cost: 0,
      labor_cost: quoteSettings?.default_labor_cost ?? 15000,
      discount_percentage: 0,
      discount_amount: 0,
    });
    setDiscountType("amount");
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    // Auto-fill RUT and name from selected customer
    const formattedRUT = customer.rut ? formatRUT(customer.rut) : "";
    setCustomerRUT(formattedRUT);
    // Set business name from customer name or business_name
    const customerName =
      customer.name ||
      (customer.first_name && customer.last_name
        ? `${customer.first_name} ${customer.last_name}`
        : customer.email || "");
    setCustomerBusinessName(customer.business_name || customerName);
    // Keep search term for display but clear results
    setCustomerSearchTerm(customer.name || customer.email || "");
    setCustomerSearchResults([]);

    // Reset form when changing customer
    setSelectedQuote(null);
    setSelectedFrame(null);
    setSelectedNearFrame(null);
    setNearFrameSearch("");
    setNearFrameResults([]);
    setCustomerOwnFrame(false);
    setCustomerOwnNearFrame(false);
    setManualLensPrice(false);
    setPresbyopiaSolution("none");
    setFarLensFamilyId("");
    setNearLensFamilyId("");
    setFarLensCost(0);
    setNearLensCost(0);
    setOrderFormData({
      frame_name: "",
      frame_brand: "",
      frame_model: "",
      frame_color: "",
      frame_size: "",
      frame_sku: "",
      frame_price: 0,
      lens_family_id: "",
      lens_type: "",
      lens_material: "",
      lens_index: null,
      lens_treatments: [],
      lens_tint_color: "",
      lens_tint_percentage: 0,
      presbyopia_solution: "none" as PresbyopiaSolution,
      far_lens_family_id: "",
      near_lens_family_id: "",
      far_lens_cost: 0,
      near_lens_cost: 0,
      // Contact lens fields
      contact_lens_family_id: "",
      contact_lens_rx_sphere_od: null,
      contact_lens_rx_cylinder_od: null,
      contact_lens_rx_axis_od: null,
      contact_lens_rx_add_od: null,
      contact_lens_rx_base_curve_od: null,
      contact_lens_rx_diameter_od: null,
      contact_lens_rx_sphere_os: null,
      contact_lens_rx_cylinder_os: null,
      contact_lens_rx_axis_os: null,
      contact_lens_rx_add_os: null,
      contact_lens_rx_base_curve_os: null,
      contact_lens_rx_diameter_os: null,
      contact_lens_quantity: 1,
      contact_lens_cost: 0,
      contact_lens_price: 0,
      // Second frame for two separate lenses (near vision)
      near_frame_product_id: "",
      near_frame_name: "",
      near_frame_brand: "",
      near_frame_model: "",
      near_frame_color: "",
      near_frame_size: "",
      near_frame_sku: "",
      near_frame_price: 0,
      near_frame_price_includes_tax: false,
      near_frame_cost: 0,
      customer_own_near_frame: false,
      frame_cost: 0,
      lens_cost: 0,
      treatments_cost: 0,
      labor_cost: quoteSettings?.default_labor_cost ?? 15000,
      discount_percentage: 0,
      discount_amount: 0,
    });
    setDiscountType("amount"); // Reset to default

    // Fetch customer quotes and prescriptions
    await Promise.all([
      fetchCustomerQuotes(
        customer.id,
        false,
        customer.rut ?? undefined,
        customer.email ?? undefined,
      ),
      fetchCustomerPrescriptions(customer.id),
    ]);
  };

  // Fetch customer prescriptions and auto-select current or first
  const fetchCustomerPrescriptions = async (customerId: string) => {
    try {
      const rx = await customerService.getPrescriptions(customerId);
      const list = rx || [];
      setPrescriptions(list);
      const current = list.find((p: any) => p.is_current) ?? list[0] ?? null;
      setSelectedPrescription(current);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    }
  };

  // Create external customer with prescription (for walk-in customers)
  const handleCreateExternalCustomerWithPrescription = async () => {
    try {
      setCreatingExternalCustomer(true);

      // Validate required fields
      if (!externalCustomerData.first_name && !externalCustomerData.last_name) {
        toast.error("El nombre o apellido es requerido");
        return;
      }
      if (!externalCustomerData.rut || externalCustomerData.rut.trim() === "") {
        toast.error("El RUT es requerido");
        return;
      }

      // Validate prescription has at least one eye
      const hasOD =
        externalPrescriptionData.od_sphere ||
        externalPrescriptionData.od_cylinder ||
        externalPrescriptionData.od_add;
      const hasOS =
        externalPrescriptionData.os_sphere ||
        externalPrescriptionData.os_cylinder ||
        externalPrescriptionData.os_add;
      if (!hasOD && !hasOS) {
        toast.error("La receta debe tener al menos un ojo con datos");
        return;
      }

      // Step 1: Create customer using customerService
      const newCustomer = await customerService.createCustomer({
        first_name: externalCustomerData.first_name,
        last_name: externalCustomerData.last_name,
        email:
          externalCustomerData.email ||
          `${externalCustomerData.first_name.toLowerCase()}.${externalCustomerData.last_name.toLowerCase()}@placeholder.com`,
        phone: externalCustomerData.phone || undefined,
        rut: externalCustomerData.rut || undefined,
        branch_id: currentBranchId || undefined,
      });

      // Step 2: Create prescription for the new customer
      const newPrescription = await customerService.createPrescription(
        newCustomer.id,
        {
          prescription_date: externalPrescriptionData.prescription_date,
          expiration_date:
            externalPrescriptionData.expiration_date || undefined,
          prescription_number:
            externalPrescriptionData.prescription_number || undefined,
          issued_by: externalPrescriptionData.issued_by || undefined,
          issued_by_license:
            externalPrescriptionData.issued_by_license || undefined,
          od_sphere: externalPrescriptionData.od_sphere
            ? parseFloat(externalPrescriptionData.od_sphere)
            : undefined,
          od_cylinder: externalPrescriptionData.od_cylinder
            ? parseFloat(externalPrescriptionData.od_cylinder)
            : undefined,
          od_axis: externalPrescriptionData.od_axis
            ? parseInt(externalPrescriptionData.od_axis)
            : undefined,
          od_add: externalPrescriptionData.od_add
            ? parseFloat(externalPrescriptionData.od_add)
            : undefined,
          od_pd: externalPrescriptionData.pd
            ? parseFloat(externalPrescriptionData.pd) / 2
            : undefined,
          od_near_pd: externalPrescriptionData.near_pd
            ? parseFloat(externalPrescriptionData.near_pd) / 2
            : undefined,
          os_sphere: externalPrescriptionData.os_sphere
            ? parseFloat(externalPrescriptionData.os_sphere)
            : undefined,
          os_cylinder: externalPrescriptionData.os_cylinder
            ? parseFloat(externalPrescriptionData.os_cylinder)
            : undefined,
          os_axis: externalPrescriptionData.os_axis
            ? parseInt(externalPrescriptionData.os_axis)
            : undefined,
          os_add: externalPrescriptionData.os_add
            ? parseFloat(externalPrescriptionData.os_add)
            : undefined,
          os_pd: externalPrescriptionData.pd
            ? parseFloat(externalPrescriptionData.pd) / 2
            : undefined,
          os_near_pd: externalPrescriptionData.near_pd
            ? parseFloat(externalPrescriptionData.near_pd) / 2
            : undefined,
          frame_pd: externalPrescriptionData.frame_pd
            ? parseFloat(externalPrescriptionData.frame_pd)
            : undefined,
          height_segmentation: externalPrescriptionData.height_segmentation
            ? parseFloat(externalPrescriptionData.height_segmentation)
            : undefined,
          is_current: true, // Mark as current prescription
        },
      );

      // Step 3: Set the new customer and prescription as selected
      const customer = {
        id: newCustomer.id,
        email: newCustomer.email || "",
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        name: `${newCustomer.first_name || ""} ${newCustomer.last_name || ""}`.trim(),
        rut: newCustomer.rut,
        phone: newCustomer.phone,
      };

      setSelectedCustomer(customer);
      if (customer.rut) {
        setCustomerRUT(formatRUT(customer.rut));
      }

      // Fetch prescriptions and quotes for the new customer
      await fetchCustomerPrescriptions(customer.id);
      await fetchCustomerQuotes(
        customer.id,
        false,
        customer.rut ?? undefined,
        customer.email ?? undefined,
      );

      // Set the new prescription as selected after a short delay
      setTimeout(() => {
        setSelectedPrescription(newPrescription);
      }, 300);

      // Close dialog and reset form
      setShowExternalPrescriptionDialog(false);
      setExternalCustomerData({
        first_name: "",
        last_name: "",
        rut: "",
        phone: "",
        email: "",
      });
      setExternalPrescriptionData({
        prescription_date: getTodayInTimezone("America/Santiago"),
        expiration_date: "",
        prescription_number: "",
        issued_by: "",
        issued_by_license: "",
        od_sphere: "",
        od_cylinder: "",
        od_axis: "",
        od_add: "",
        os_sphere: "",
        os_cylinder: "",
        os_axis: "",
        os_add: "",
        pd: "",
        near_pd: "",
        frame_pd: "",
        height_segmentation: "",
      });

      toast.success(
        "Cliente y receta creados exitosamente. Puedes continuar con la orden.",
      );
    } catch (error: any) {
      console.error("Error creating external customer:", error);
      toast.error(error.message || "Error al crear cliente y receta");
    } finally {
      setCreatingExternalCustomer(false);
    }
  };

  // Fetch quote settings and lens families
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await quoteSettingsService.get();
        if (settings) {
          setQuoteSettings(settings);
          if (settings.default_labor_cost) {
            setOrderFormData((prev) => ({
              ...prev,
              labor_cost: settings.default_labor_cost,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching quote settings:", error);
      }
    };
    fetchSettings();
    fetchLensFamilies();
    fetchContactLensFamilies();
  }, []);

  // Load pending balance orders when dialog opens
  useEffect(() => {
    if (showPendingBalanceDialog) {
      fetchPendingBalanceOrders();
    }
  }, [showPendingBalanceDialog]);

  // Fetch lens families
  const fetchLensFamilies = async () => {
    try {
      setLoadingFamilies(true);
      const families = await lensFamilyService.getAll();
      setLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching lens families:", error);
    } finally {
      setLoadingFamilies(false);
    }
  };

  // Fetch contact lens families
  const fetchContactLensFamilies = async () => {
    try {
      setLoadingContactLensFamilies(true);
      const families = await contactLensFamilyService.getAll();
      console.log(
        "Contact lens families loaded in POS:",
        families?.length || 0,
        "families",
      );
      setContactLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching contact lens families:", error);
    } finally {
      setLoadingContactLensFamilies(false);
    }
  };

  // Ensure prescriptions load whenever selectedCustomer changes (also for quote loads)
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerPrescriptions(selectedCustomer.id);
    } else {
      setPrescriptions([]);
      setSelectedPrescription(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id]);

  // When a family is selected, inherit genetic properties (type/material) from that family
  useEffect(() => {
    if (!orderFormData.lens_family_id) return;
    const family = lensFamilies.find(
      (f) => f.id === orderFormData.lens_family_id,
    );
    if (!family) return;

    // Obtener el índice de refracción según el material de la familia
    const materialIndex = family.lens_material
      ? MATERIAL_INDICES[family.lens_material] || null
      : null;

    setOrderFormData((prev) => ({
      ...prev,
      lens_type: family.lens_type || prev.lens_type,
      lens_material: family.lens_material || prev.lens_material,
      lens_index: materialIndex !== null ? materialIndex : prev.lens_index,
      // Treatments are included in family price (no extras)
      lens_treatments: [],
      treatments_cost: 0,
    }));
  }, [orderFormData.lens_family_id, lensFamilies]);

  // Calculate contact lens price from matrix
  const calculateContactLensPriceFromMatrix = async () => {
    if (!orderFormData.contact_lens_family_id || !selectedPrescription) {
      return;
    }

    // Validate contact_lens_family_id is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderFormData.contact_lens_family_id)) {
      return;
    }

    try {
      setCalculatingContactLensPrice(true);

      // Get sphere value from prescription (use OD sphere for calculation)
      const sphereOD = selectedPrescription.od_sphere || 0;
      const cylinderOD = selectedPrescription.od_cylinder || 0;
      const axisOD = selectedPrescription.od_axis || null;
      const additionOD = selectedPrescription.od_add || null;

      // Use contactLensMatrixService for calculation
      const calculation = await contactLensMatrixService.calculate(
        orderFormData.contact_lens_family_id,
        sphereOD,
        cylinderOD,
        axisOD,
        additionOD,
      );

      if (!calculation) {
        toast.error("No se pudo calcular el precio del lente de contacto");
        return;
      }

      if (calculation.price) {
        // Calculate total price: price per box * quantity
        const quantity = orderFormData.contact_lens_quantity || 1;
        const totalPrice = calculation.price * quantity;
        const totalCost = calculation.cost * quantity;

        setOrderFormData((prev) => ({
          ...prev,
          contact_lens_price: totalPrice,
          contact_lens_cost: totalCost,
        }));
      }
    } catch (error) {
      console.warn(
        "Could not calculate contact lens price from matrix:",
        error,
      );
      toast.error("No se pudo calcular el precio del lente de contacto");
    } finally {
      setCalculatingContactLensPrice(false);
    }
  };

  // Recalculate contact lens price when relevant fields change
  useEffect(() => {
    if (
      orderFormData.contact_lens_family_id &&
      selectedPrescription &&
      lensType === "contact"
    ) {
      const timer = setTimeout(() => {
        calculateContactLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    orderFormData.contact_lens_family_id,
    orderFormData.contact_lens_quantity,
    selectedPrescription?.id,
    lensType,
  ]);

  // Detect presbyopia and set default solution
  useEffect(() => {
    if (selectedPrescription) {
      const hasAdd = hasAddition(selectedPrescription);
      if (hasAdd && presbyopiaSolution === "none") {
        const defaultSolution =
          getDefaultPresbyopiaSolution(selectedPrescription);
        setPresbyopiaSolution(defaultSolution);
        setOrderFormData((prev) => ({
          ...prev,
          presbyopia_solution: defaultSolution,
        }));
        if (
          defaultSolution === "progressive" ||
          defaultSolution === "bifocal" ||
          defaultSolution === "trifocal"
        ) {
          setOrderFormData((prev) => ({ ...prev, lens_type: defaultSolution }));
        }
      } else if (!hasAdd) {
        setPresbyopiaSolution("none");
        setOrderFormData((prev) => ({ ...prev, presbyopia_solution: "none" }));
      }
    }
  }, [selectedPrescription]);

  // Calculate prices for two separate lenses
  useEffect(() => {
    if (
      presbyopiaSolution === "two_separate" &&
      selectedPrescription &&
      !manualLensPrice
    ) {
      const calculateTwoLenses = async () => {
        // Calculate far lens price
        if (farLensFamilyId) {
          const farSphere = getFarSphere(selectedPrescription);
          const cylinder = getCylinder(selectedPrescription);
          const result = await calculateLensPrice({
            lens_family_id: farLensFamilyId,
            sphere: farSphere,
            cylinder: cylinder !== 0 ? cylinder : undefined,
          });
          if (result && result.price) {
            setFarLensCost(result.price);
            setOrderFormData((prev) => ({
              ...prev,
              far_lens_cost: result.price,
            }));
          }
        }

        // Calculate near lens price
        if (nearLensFamilyId) {
          const nearSphere = getNearSphere(selectedPrescription);
          const cylinder = getCylinder(selectedPrescription);
          const result = await calculateLensPrice({
            lens_family_id: nearLensFamilyId,
            sphere: nearSphere,
            cylinder: cylinder, // Always send cylinder, even if 0, to match ranges that include 0
          });
          if (result && result.price) {
            setNearLensCost(result.price);
            setOrderFormData((prev) => ({
              ...prev,
              near_lens_cost: result.price,
            }));
          }
        }

        // Update total lens cost
        const totalLensCost = farLensCost + nearLensCost;
        setOrderFormData((prev) => ({ ...prev, lens_cost: totalLensCost }));
      };
      calculateTwoLenses();
    }
  }, [
    farLensFamilyId,
    nearLensFamilyId,
    selectedPrescription,
    presbyopiaSolution,
    manualLensPrice,
  ]);

  // Calculate lens price from matrix when parameters change
  const calculateLensPriceFromMatrix = async () => {
    if (
      !orderFormData.lens_family_id ||
      !selectedPrescription ||
      manualLensPrice
    ) {
      return;
    }

    // Skip if two separate lenses (handled separately)
    if (presbyopiaSolution === "two_separate") {
      return;
    }

    // Get sphere value from prescription
    const farSphere = getFarSphere(selectedPrescription);
    const cylinder = getCylinder(selectedPrescription);

    // For progressive/bifocal/trifocal, include addition in calculation
    let addition: number | undefined = undefined;
    if (
      presbyopiaSolution === "progressive" ||
      presbyopiaSolution === "bifocal" ||
      presbyopiaSolution === "trifocal"
    ) {
      addition = getMaxAddition(selectedPrescription);
    }

    try {
      const result = await calculateLensPrice({
        lens_family_id: orderFormData.lens_family_id,
        sphere: farSphere,
        cylinder: cylinder, // Always send cylinder, even if 0, to match ranges that include 0
        addition: addition,
      });

      if (result && result.price) {
        setOrderFormData((prev) => ({ ...prev, lens_cost: result.price }));
      }
    } catch (error) {
      // Silently fail - user can manually enter price if matrix doesn't exist
      console.warn("Could not calculate lens price from matrix:", error);
    }
  };

  // Recalculate price when relevant fields change
  useEffect(() => {
    if (orderFormData.lens_family_id && selectedPrescription) {
      calculateLensPriceFromMatrix();
    }
  }, [
    orderFormData.lens_family_id,
    selectedPrescription?.id,
    manualLensPrice,
    presbyopiaSolution,
  ]);

  // Search frames for complete order
  useEffect(() => {
    const searchFrames = async () => {
      if (frameSearch.trim().length < 2) {
        setFrameResults([]);
        return;
      }
      setSearchingFrames(true);
      try {
        const headers: HeadersInit = {
          ...getBranchHeader(currentBranchId),
        };
        const response = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(frameSearch)}&type=frame&limit=10`,
          { headers },
        );
        if (response.ok) {
          const data = await response.json();
          setFrameResults(extractDataFromResponse<Product>(data));
        }
      } catch (error) {
        console.error("Error searching frames:", error);
      } finally {
        setSearchingFrames(false);
      }
    };
    const debounce = setTimeout(searchFrames, 300);
    return () => clearTimeout(debounce);
  }, [frameSearch, currentBranchId]);

  // Search near frames for two separate lenses
  useEffect(() => {
    const searchNearFrames = async () => {
      if (nearFrameSearch.trim().length < 2) {
        setNearFrameResults([]);
        return;
      }
      setSearchingNearFrames(true);
      try {
        const headers: HeadersInit = {
          ...getBranchHeader(currentBranchId),
        };
        const response = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(nearFrameSearch)}&type=frame&limit=10`,
          { headers },
        );
        if (response.ok) {
          const data = await response.json();
          setNearFrameResults(extractDataFromResponse<Product>(data));
        }
      } catch (error) {
        console.error("Error searching near frames:", error);
      } finally {
        setSearchingNearFrames(false);
      }
    };

    const debounce = setTimeout(searchNearFrames, 300);
    return () => clearTimeout(debounce);
  }, [nearFrameSearch, currentBranchId]);

  // Lens types and materials
  const lensTypes = [
    { value: "single_vision", label: "Visión Simple" },
    { value: "bifocal", label: "Bifocal" },
    { value: "trifocal", label: "Trifocal" },
    { value: "progressive", label: "Progresivo" },
    { value: "reading", label: "Lectura" },
    { value: "computer", label: "Computadora" },
    { value: "sports", label: "Deportivo" },
  ];

  const lensMaterials = [
    { value: "cr39", label: "CR-39" },
    { value: "polycarbonate", label: "Policarbonato" },
    { value: "high_index_1_67", label: "Alto Índice 1.67" },
    { value: "high_index_1_74", label: "Alto Índice 1.74" },
    { value: "trivex", label: "Trivex" },
    { value: "glass", label: "Vidrio" },
  ];

  // Mapa de materiales a índices de refracción
  const MATERIAL_INDICES: Record<string, number> = {
    cr39: 1.49,
    mid_index: 1.56,
    polycarbonate: 1.59,
    high_index_1_60: 1.6,
    high_index_1_67: 1.67,
    high_index_1_74: 1.74,
    trivex: 1.53,
    glass: 1.52,
  };

  // Available treatments
  const availableTreatments = quoteSettings
    ? [
        {
          value: "anti_reflective",
          label: "Anti-reflejante",
          cost: quoteSettings.treatment_prices?.anti_reflective || 15000,
        },
        {
          value: "blue_light_filter",
          label: "Filtro Luz Azul",
          cost: quoteSettings.treatment_prices?.blue_light_filter || 20000,
        },
        {
          value: "uv_protection",
          label: "Protección UV",
          cost: quoteSettings.treatment_prices?.uv_protection || 10000,
        },
        {
          value: "scratch_resistant",
          label: "Anti-rayas",
          cost: quoteSettings.treatment_prices?.scratch_resistant || 12000,
        },
        {
          value: "anti_fog",
          label: "Anti-empañamiento",
          cost: quoteSettings.treatment_prices?.anti_fog || 8000,
        },
        {
          value: "photochromic",
          label: "Fotocromático",
          cost: quoteSettings.treatment_prices?.photochromic || 35000,
        },
        {
          value: "polarized",
          label: "Polarizado",
          cost: quoteSettings.treatment_prices?.polarized || 25000,
        },
        {
          value: "tint",
          label: "Tinte",
          cost: quoteSettings.treatment_prices?.tint || 15000,
        },
      ]
    : [
        { value: "anti_reflective", label: "Anti-reflejante", cost: 15000 },
        { value: "blue_light_filter", label: "Filtro Luz Azul", cost: 20000 },
        { value: "uv_protection", label: "Protección UV", cost: 10000 },
        { value: "scratch_resistant", label: "Anti-rayas", cost: 12000 },
        { value: "anti_fog", label: "Anti-empañamiento", cost: 8000 },
        { value: "photochromic", label: "Fotocromático", cost: 35000 },
        { value: "polarized", label: "Polarizado", cost: 25000 },
        { value: "tint", label: "Tinte", cost: 15000 },
      ];

  // Manual lens cost calculation removed - now only family + matrices or manual input

  // Handle treatment toggle
  // When a lens family is selected, only allow "tint" and "prism_extra" as extras
  // All other treatments are included in the family price
  const handleTreatmentToggle = (
    treatment: (typeof availableTreatments)[0],
  ) => {
    // If a family is selected, only allow tint and prism_extra
    if (orderFormData.lens_family_id) {
      const allowedExtras = ["tint", "prism_extra"];
      if (!allowedExtras.includes(treatment.value)) {
        toast.info(
          "Este tratamiento está incluido en la familia de lentes seleccionada",
        );
        return;
      }
    }

    const isSelected = orderFormData.lens_treatments.includes(treatment.value);
    let newTreatments = [...orderFormData.lens_treatments];
    let treatmentsCost = orderFormData.treatments_cost;

    if (isSelected) {
      newTreatments = newTreatments.filter((t) => t !== treatment.value);
      treatmentsCost -= treatment.cost;
    } else {
      newTreatments.push(treatment.value);
      treatmentsCost += treatment.cost;
    }

    setOrderFormData((prev) => ({
      ...prev,
      lens_treatments: newTreatments,
      treatments_cost: treatmentsCost,
    }));
  };

  // Handle frame select for complete order
  const handleFrameSelectForOrder = (frame: any) => {
    setSelectedFrame(frame);
    setOrderFormData((prev) => ({
      ...prev,
      frame_name: frame.name,
      frame_brand: frame.frame_brand || "",
      frame_model: frame.frame_model || "",
      frame_color: frame.frame_color || "",
      frame_size: frame.frame_size || "",
      frame_sku: frame.sku || "",
      frame_price: customerOwnFrame ? 0 : frame.price || 0,
      frame_cost: customerOwnFrame ? 0 : frame.price || 0,
    }));
    setFrameSearch("");
    setFrameResults([]);
  };

  // Handle near frame select for two separate lenses
  const handleNearFrameSelectForOrder = (frame: any) => {
    setSelectedNearFrame(frame);
    setOrderFormData((prev) => ({
      ...prev,
      near_frame_product_id: frame.id,
      near_frame_name: frame.name,
      near_frame_brand: frame.frame_brand || "",
      near_frame_model: frame.frame_model || "",
      near_frame_color: frame.frame_color || "",
      near_frame_size: frame.frame_size || "",
      near_frame_sku: frame.sku || "",
      near_frame_price: customerOwnNearFrame ? 0 : frame.price || 0,
      near_frame_price_includes_tax: frame.price_includes_tax || false,
      near_frame_cost: customerOwnNearFrame ? 0 : frame.price || 0,
    }));
    setNearFrameSearch("");
    setNearFrameResults([]);
  };

  // Add complete order to cart (individual items, don't clear cart)
  const handleAddCompleteOrderToCart = () => {
    // Validate lens configuration based on lens type
    if (lensType === "contact") {
      if (
        !orderFormData.contact_lens_family_id &&
        orderFormData.contact_lens_cost === 0
      ) {
        toast.error(
          "Selecciona una familia de lentes de contacto o ingresa el precio manualmente",
        );
        return;
      }
    } else {
      if (!orderFormData.lens_family_id && orderFormData.lens_cost === 0) {
        toast.error(
          "Selecciona una familia de lentes o ingresa el precio manualmente",
        );
        return;
      }
    }

    console.log("🛒 Adding complete order to cart");
    console.log("📋 Order form data:", orderFormData);
    console.log("🖼️ Selected frame:", selectedFrame);

    let itemsAdded = 0;
    const baseTimestamp = Date.now();
    const itemsToAdd: Product[] = [];

    // Add frame - use frame_cost (which is the actual price) or frame_price as fallback
    // If customer brings frame, price is 0
    const framePrice = customerOwnFrame
      ? 0
      : orderFormData.frame_cost > 0
        ? orderFormData.frame_cost
        : orderFormData.frame_price || 0;

    if (orderFormData.frame_name || framePrice > 0 || customerOwnFrame) {
      let frameProduct: Product;

      if (
        selectedFrame &&
        selectedFrame.id &&
        !selectedFrame.id.startsWith("frame-manual-")
      ) {
        // Frame from product catalog - use unique ID to avoid conflicts
        frameProduct = {
          id: `${selectedFrame.id}-${baseTimestamp}`,
          name: orderFormData.frame_name || selectedFrame.name,
          price: framePrice,
          price_includes_tax: selectedFrame.price_includes_tax ?? true, // Default IVA incluido
          inventory_quantity: selectedFrame.inventory_quantity || 0,
          sku: orderFormData.frame_sku || selectedFrame.sku || "FRAME",
          barcode: selectedFrame.barcode,
          featured_image: selectedFrame.featured_image,
        };
      } else {
        // Manual frame entry (no product in catalog)
        const frameName =
          orderFormData.frame_name ||
          (orderFormData.frame_brand && orderFormData.frame_model
            ? `${orderFormData.frame_brand} ${orderFormData.frame_model}`
            : "Marco");
        frameProduct = {
          id: `frame-manual-${baseTimestamp}-1`,
          name: frameName,
          price: framePrice,
          price_includes_tax: true, // IVA incluido por defecto
          inventory_quantity: 999,
          sku: orderFormData.frame_sku || "FRAME-MANUAL",
        };
      }

      itemsToAdd.push(frameProduct);
      itemsAdded++;
      console.log("✅ Frame prepared:", frameProduct);
    }

    // Add second frame for two separate lenses (near vision)
    if (presbyopiaSolution === "two_separate" && !customerOwnNearFrame) {
      const nearFramePrice =
        orderFormData.near_frame_cost > 0
          ? orderFormData.near_frame_cost
          : orderFormData.near_frame_price || 0;

      if (orderFormData.near_frame_name || nearFramePrice > 0) {
        let nearFrameProduct: Product;

        if (
          selectedNearFrame &&
          selectedNearFrame.id &&
          !selectedNearFrame.id.startsWith("frame-manual-")
        ) {
          // Near frame from product catalog
          nearFrameProduct = {
            id: `${selectedNearFrame.id}-near-${baseTimestamp}`,
            name:
              orderFormData.near_frame_name ||
              selectedNearFrame.name ||
              "Marco de Cerca",
            price: nearFramePrice,
            price_includes_tax: selectedNearFrame.price_includes_tax ?? true,
            inventory_quantity: selectedNearFrame.inventory_quantity || 0,
            sku:
              orderFormData.near_frame_sku ||
              selectedNearFrame.sku ||
              "FRAME-NEAR",
            barcode: selectedNearFrame.barcode,
            featured_image: selectedNearFrame.featured_image,
          };
        } else {
          // Manual near frame entry
          const nearFrameName =
            orderFormData.near_frame_name ||
            (orderFormData.near_frame_brand && orderFormData.near_frame_model
              ? `${orderFormData.near_frame_brand} ${orderFormData.near_frame_model} (Cerca)`
              : "Marco de Cerca");
          nearFrameProduct = {
            id: `frame-manual-near-${baseTimestamp}`,
            name: nearFrameName,
            price: nearFramePrice,
            price_includes_tax: true,
            inventory_quantity: 999,
            sku: orderFormData.near_frame_sku || "FRAME-NEAR-MANUAL",
          };
        }

        itemsToAdd.push(nearFrameProduct);
        itemsAdded++;
        console.log("✅ Near frame prepared:", nearFrameProduct);
      }
    }

    // Add lens(es) - handle both single lens and two separate lenses
    if (presbyopiaSolution === "two_separate") {
      // For two separate lenses, add both far and near lenses
      const totalLensCost = (farLensCost || 0) + (nearLensCost || 0);
      if (totalLensCost > 0) {
        const farLensFamilyName = farLensFamilyId
          ? lensFamilies.find((f) => f.id === farLensFamilyId)?.name || "N/A"
          : "Manual";
        const nearLensFamilyName = nearLensFamilyId
          ? lensFamilies.find((f) => f.id === nearLensFamilyId)?.name || "N/A"
          : "Manual";

        const lensProduct: Product = {
          id: `lens-two-separate-${baseTimestamp}`,
          name: `Lentes (Lejos: ${farLensFamilyName}, Cerca: ${nearLensFamilyName})`,
          price: totalLensCost,
          price_includes_tax: true,
          inventory_quantity: 999,
          sku: `LENS-TWO-SEPARATE-${baseTimestamp}`,
        };
        itemsToAdd.push(lensProduct);
        itemsAdded++;
        console.log("✅ Two separate lenses prepared:", lensProduct);
      }
    } else if (lensType === "contact") {
      // Contact lens
      const contactLensName = orderFormData.contact_lens_family_id
        ? `Lentes de Contacto (${contactLensFamilies.find((f) => f.id === orderFormData.contact_lens_family_id)?.name || "N/A"}) - ${orderFormData.contact_lens_quantity || 1} caja(s)`
        : `Lentes de Contacto (Precio manual) - ${orderFormData.contact_lens_quantity || 1} caja(s)`;
      const contactLensProduct: Product = {
        id: `contact-lens-${baseTimestamp}`,
        name: contactLensName,
        price:
          orderFormData.contact_lens_price ||
          orderFormData.contact_lens_cost ||
          0,
        price_includes_tax: true, // IVA incluido por defecto
        inventory_quantity: 999,
        sku: orderFormData.contact_lens_family_id
          ? `CL-FAMILY-${orderFormData.contact_lens_family_id.substring(0, 8).toUpperCase()}`
          : `CL-MANUAL-${baseTimestamp}`,
      };
      itemsToAdd.push(contactLensProduct);
      itemsAdded++;
      console.log("✅ Contact lens prepared:", contactLensProduct);
    } else if (orderFormData.lens_family_id || orderFormData.lens_cost > 0) {
      // Single optical lens
      const lensName = orderFormData.lens_family_id
        ? `Lente (Familia: ${lensFamilies.find((f) => f.id === orderFormData.lens_family_id)?.name || "N/A"})`
        : `Lente (Precio manual)`;
      const lensProduct: Product = {
        id: `lens-${baseTimestamp}-2`,
        name: lensName,
        price: orderFormData.lens_cost || 0,
        price_includes_tax: true, // IVA incluido por defecto
        inventory_quantity: 999,
        sku: orderFormData.lens_family_id
          ? `LENS-FAMILY-${orderFormData.lens_family_id.substring(0, 8).toUpperCase()}`
          : `LENS-MANUAL-${baseTimestamp}`,
      };
      itemsToAdd.push(lensProduct);
      itemsAdded++;
      console.log("✅ Lens prepared:", lensProduct);
    }

    // Add treatments - add if treatments exist
    if (
      orderFormData.lens_treatments &&
      Array.isArray(orderFormData.lens_treatments) &&
      orderFormData.lens_treatments.length > 0
    ) {
      const treatmentLabels = orderFormData.lens_treatments.map((t: string) => {
        const treatment = availableTreatments.find((at) => at.value === t);
        return treatment ? treatment.label : t;
      });
      const treatmentProduct: Product = {
        id: `treatments-${baseTimestamp}-3`,
        name: `Tratamientos: ${treatmentLabels.join(", ")}`,
        price: orderFormData.treatments_cost || 0,
        price_includes_tax: true, // IVA incluido por defecto
        inventory_quantity: 999,
        sku: "TREATMENTS",
      };
      itemsToAdd.push(treatmentProduct);
      itemsAdded++;
      console.log("✅ Treatments prepared:", treatmentProduct);
    }

    // Add labor - always add if labor_cost > 0
    if (orderFormData.labor_cost > 0) {
      const laborProduct: Product = {
        id: `labor-${baseTimestamp}-4`,
        name: "Mano de obra (montaje)",
        price: orderFormData.labor_cost,
        price_includes_tax: true, // IVA incluido por defecto
        inventory_quantity: 999,
        sku: "LABOR",
      };
      itemsToAdd.push(laborProduct);
      itemsAdded++;
      console.log("✅ Labor prepared:", laborProduct);
    }

    // Calculate discount amount based on type
    // Include second frame price if two separate lenses
    const nearFramePrice =
      presbyopiaSolution === "two_separate" && !customerOwnNearFrame
        ? orderFormData.near_frame_cost > 0
          ? orderFormData.near_frame_cost
          : orderFormData.near_frame_price || 0
        : 0;

    // Calculate lens cost - for two_separate, use sum of far and near lens costs
    const effectiveLensCost =
      presbyopiaSolution === "two_separate"
        ? (farLensCost || 0) + (nearLensCost || 0)
        : orderFormData.lens_cost || 0;

    // Calculate total with tax (all prices already include tax by default)
    // This matches how the quote form calculates the total
    const orderTotalWithTax =
      framePrice +
      nearFramePrice +
      effectiveLensCost +
      orderFormData.treatments_cost +
      orderFormData.labor_cost;

    let discountAmount = 0;
    let discountLabel = "";

    if (discountType === "percentage") {
      // Apply discount to total with tax (matching quote form logic)
      discountAmount =
        orderTotalWithTax * (orderFormData.discount_percentage / 100);
      discountLabel = `Descuento (${orderFormData.discount_percentage}%)`;
    } else {
      // Discount by amount (already calculated on total with tax in quote form)
      discountAmount = orderFormData.discount_amount || 0;
      discountLabel = `Descuento ($${formatPrice(discountAmount)})`;
    }

    // Ensure discount doesn't exceed total with tax
    if (discountAmount > orderTotalWithTax) {
      discountAmount = orderTotalWithTax;
    }

    // Add all items to cart at once using a single state update
    if (itemsToAdd.length > 0) {
      console.log(`🛒 Adding ${itemsToAdd.length} items to cart`);
      itemsToAdd.forEach((product, index) => {
        console.log(
          `  ${index + 1}. Adding: ${product.name} - $${product.price}`,
        );
      });

      if (discountAmount > 0) {
        console.log(
          `  💰 Discount: ${discountLabel} = -$${formatPrice(discountAmount)}`,
        );
      }

      // Use a single setCart call to add all items at once
      setCart((prevCart) => {
        const newCart = [...prevCart];

        itemsToAdd.forEach((product) => {
          // Check if item already exists (by ID)
          const existingIndex = newCart.findIndex(
            (item) => item.product.id === product.id,
          );

          if (existingIndex >= 0) {
            // Update quantity if exists
            newCart[existingIndex] = {
              ...newCart[existingIndex],
              quantity: newCart[existingIndex].quantity + 1,
              subtotal:
                newCart[existingIndex].unitPrice *
                (newCart[existingIndex].quantity + 1),
            };
          } else {
            // Add new item
            newCart.push({
              product,
              quantity: 1,
              unitPrice: product.price,
              subtotal: product.price,
              // Default to true (IVA incluido) if not specified - typical in Chile
              priceIncludesTax: product.price_includes_tax ?? true,
            });
          }
        });

        // Add discount as a negative item if discount exists
        if (discountAmount > 0) {
          const discountProduct: Product = {
            id: `discount-${baseTimestamp}`,
            name: discountLabel,
            price: -discountAmount,
            inventory_quantity: 999,
            sku: "DISCOUNT",
          };

          // Check if discount already exists
          const discountIndex = newCart.findIndex(
            (item) => item.product.id === discountProduct.id,
          );
          if (discountIndex >= 0) {
            // Update discount amount
            // Discount applies to total with tax, so it should also include tax
            newCart[discountIndex] = {
              product: discountProduct,
              quantity: 1,
              unitPrice: -discountAmount,
              subtotal: -discountAmount,
              priceIncludesTax: true, // Discount applies to total with tax, so it includes tax
            };
          } else {
            // Add discount
            // Discount should be applied to total with tax, so it should also include tax
            // This ensures the discount is subtracted correctly from the total
            newCart.push({
              product: discountProduct,
              quantity: 1,
              unitPrice: -discountAmount,
              subtotal: -discountAmount,
              priceIncludesTax: true, // Discount applies to total with tax, so it includes tax
            });
          }
        }

        console.log(`✅ Cart updated with ${newCart.length} items`);
        return newCart;
      });

      toast.success(
        `${itemsAdded} elemento(s) agregado(s) al carrito${discountAmount > 0 ? ` con descuento del ${orderFormData.discount_percentage}%` : ""}`,
      );
    } else {
      toast.warning(
        "No hay elementos para agregar. Verifica que el formulario esté completo.",
      );
    }
  };

  const handleLoadQuote = async (quote: Quote | { id: string }) => {
    try {
      // Use the new load-to-pos endpoint
      const response = await fetch(
        `/api/admin/quotes/${quote.id}/load-to-pos`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al cargar el presupuesto");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Error al cargar el presupuesto");
      }

      // Set customer if available
      if (data.customerId) {
        setSelectedCustomer(data.customer || null);
      }

      // Populate order form and presbyopia state with quote data
      if (data.originalQuote) {
        const oq = data.originalQuote;
        const solution = oq.presbyopia_solution || "none";
        setPresbyopiaSolution(solution);
        setOrderFormData((prev) => ({
          ...prev,
          presbyopia_solution: solution,
          far_lens_family_id: oq.far_lens_family_id || prev.far_lens_family_id,
          near_lens_family_id:
            oq.near_lens_family_id || prev.near_lens_family_id,
          far_lens_cost: oq.far_lens_cost ?? prev.far_lens_cost,
          near_lens_cost: oq.near_lens_cost ?? prev.near_lens_cost,
          near_frame_product_id:
            oq.near_frame_product_id || prev.near_frame_product_id,
          near_frame_name: oq.near_frame_name || prev.near_frame_name,
          near_frame_brand: oq.near_frame_brand || prev.near_frame_brand,
          near_frame_model: oq.near_frame_model || prev.near_frame_model,
          near_frame_color: oq.near_frame_color || prev.near_frame_color,
          near_frame_size: oq.near_frame_size || prev.near_frame_size,
          near_frame_sku: oq.near_frame_sku || prev.near_frame_sku,
          near_frame_price: oq.near_frame_price ?? prev.near_frame_price,
          near_frame_cost: oq.near_frame_cost ?? prev.near_frame_cost,
          customer_own_near_frame:
            (oq as { customer_own_near_frame?: boolean })
              .customer_own_near_frame ?? prev.customer_own_near_frame,
          frame_cost: oq.frame_cost ?? prev.frame_cost,
          lens_cost: oq.lens_cost ?? prev.lens_cost,
          treatments_cost: oq.treatments_cost ?? prev.treatments_cost,
          labor_cost: oq.labor_cost ?? prev.labor_cost,
          contact_lens_family_id:
            oq.contact_lens_family_id || prev.contact_lens_family_id,
          contact_lens_quantity:
            oq.contact_lens_quantity ?? prev.contact_lens_quantity,
          contact_lens_cost: oq.contact_lens_cost ?? prev.contact_lens_cost,
          contact_lens_price: oq.contact_lens_price ?? prev.contact_lens_price,
        }));
      }

      // Clear current cart
      setCart([]);

      // Load items from quote into cart
      if (data.items && data.items.length > 0) {
        console.log("📦 Loading items from quote:", data.items);
        for (const item of data.items) {
          if (item.type === "product") {
            // Regular product (frame)
            console.log("🖼️ Adding frame to cart:", {
              id: item.id,
              name: item.name,
              price: item.price,
            });
            const product: Product = {
              id: item.id,
              name: item.name,
              price: item.price || 0, // Ensure price is always a number
              price_includes_tax: true, // IVA incluido por defecto
              inventory_quantity: item.inventory_quantity || 0,
              sku: item.sku,
              barcode: item.barcode,
              featured_image: item.featured_image,
              product_type: item.product_type || "frame", // Preserve product_type from quote item
            };
            addToCart(product);
          } else if (item.type === "contact_lens") {
            // Contact lens item
            const contactLensProduct: Product = {
              id: item.id,
              name: item.name,
              price: item.price || 0,
              price_includes_tax: true,
              inventory_quantity: 999,
              sku: "CONTACT-LENS",
            };
            addToCart(contactLensProduct);
          } else if (item.type === "lens_complete") {
            // Optical lens as custom item
            const lensProduct: Product = {
              id: item.id,
              name: item.name,
              price: item.price,
              price_includes_tax: true, // IVA incluido por defecto
              inventory_quantity: 999, // Lenses are made to order
              sku: `LENS-${item.lens_type?.toUpperCase() || "CUSTOM"}`,
            };
            addToCart(lensProduct);

            // Add treatments if they have cost
            if (item.treatments_cost > 0) {
              const treatmentProduct: Product = {
                id: `treatments-${quote.id}`,
                name: `Tratamientos: ${item.lens_treatments?.join(", ") || "Varios"}`,
                price: item.treatments_cost,
                price_includes_tax: true, // IVA incluido por defecto
                inventory_quantity: 999,
                sku: "TREATMENTS",
              };
              addToCart(treatmentProduct);
            }

            // Add labor cost if exists
            if (item.labor_cost > 0) {
              const laborProduct: Product = {
                id: `labor-${quote.id}`,
                name: "Mano de obra (montaje)",
                price: item.labor_cost,
                price_includes_tax: true, // IVA incluido por defecto
                inventory_quantity: 999,
                sku: "LABOR",
              };
              addToCart(laborProduct);
            }
          }
        }
      }

      toast.success(
        `Presupuesto ${data.quoteNumber || quote.id} cargado al carrito. Puedes editarlo antes de procesar el pago.`,
      );
      setShowQuoteDialog(false);
    } catch (error: any) {
      console.error("Error loading quote:", error);
      toast.error(error.message || "Error al cargar el presupuesto");
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    // Validar monto según método de pago
    if (paymentMethod === "cash") {
      if (isCashPartial) {
        // Efectivo parcial: validar monto parcial
        if (cashPartialAmount <= 0) {
          toast.error("Debe ingresar un monto a pagar");
          return;
        }
        if (cashPartialAmount > total) {
          toast.error("El monto a pagar no puede ser mayor al total");
          return;
        }
      } else {
        // Efectivo completo: validar monto recibido
        if (cashReceived < total) {
          toast.error("El monto recibido es menor al total");
          return;
        }
      }
    }

    if (paymentMethod === "transfer") {
      if (depositAmount <= 0) {
        toast.error("Debe ingresar un monto de transferencia");
        return;
      }
      if (depositAmount > total) {
        toast.error("El monto de transferencia no puede ser mayor al total");
        return;
      }
    }

    // Para tarjetas sin abono, se paga el total completo
    if (
      (paymentMethod === "debit_card" || paymentMethod === "credit_card") &&
      depositAmount > 0 &&
      depositAmount > total
    ) {
      toast.error("El abono no puede ser mayor al total");
      return;
    }

    // Validar RUT solo si se requiere FACTURA (no boleta) y no hay cliente seleccionado
    // Las boletas no requieren RUT obligatorio, solo las facturas
    if (siiInvoiceType === "factura" && !selectedCustomer && !customerRUT) {
      toast.error("Se requiere RUT para generar factura");
      return;
    }

    setProcessingPayment(true);

    try {
      // Lógica para verificar si realmente se requiere trabajo de laboratorio
      // Solo los marcos (frames) con datos de lentes requieren trabajo de laboratorio

      // Verificar si hay items temporales de lentes/labor (estos siempre requieren trabajo)
      const hasTemporaryLensItems = cart.some((item) => {
        const isTemporaryLensItem =
          item.product.id.startsWith("lens-") ||
          item.product.id.startsWith("treatments-") ||
          item.product.id.startsWith("labor-") ||
          item.product.id.startsWith("frame-manual-");
        return isTemporaryLensItem;
      });

      // Verificar tipos de productos en el carrito
      const productTypesInCart = cart.map((item) => {
        const product = item.product as any;
        return product?.product_type;
      });

      // Productos que NO requieren cliente registrado ni trabajo de laboratorio
      const nonWorkOrderTypes = ["accessory", "sunglasses", "service", "lens"];

      // Debug: Log product types in cart
      console.log(
        "🔍 POS Debug - Cart items:",
        cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          product_type: (item.product as any)?.product_type,
          category: (item.product as any)?.category?.name,
        })),
      );

      const hasOnlyNonWorkOrderProducts = cart.every((item) => {
        const product = item.product as any;
        const productType = product?.product_type;

        // Si el producto tiene una categoría que indica que no requiere trabajo, también permitirlo
        const categoryName =
          product?.category?.name?.toLowerCase() ||
          product?.categories?.name?.toLowerCase() ||
          null;
        const isNonWorkOrderCategory =
          categoryName &&
          (categoryName.includes("accesorio") ||
            categoryName.includes("accesorios") ||
            categoryName.includes("lente de sol") ||
            categoryName.includes("lentes de sol") ||
            categoryName.includes("servicio") ||
            categoryName.includes("servicios"));

        // Solo productos con tipos específicos que no requieren trabajo están permitidos sin cliente
        // Los descuentos siempre están permitidos
        // Si tiene categoría que indica que no requiere trabajo, también permitirlo
        // Si el producto es de tipo "frame" pero tiene categoría de accesorio, también permitirlo
        const isNonWorkOrderType =
          productType && nonWorkOrderTypes.includes(productType);
        const isFrameButAccessory =
          productType === "frame" && isNonWorkOrderCategory;

        return (
          item.product.id.startsWith("discount-") ||
          isNonWorkOrderType ||
          isNonWorkOrderCategory ||
          isFrameButAccessory
        );
      });

      console.log(
        "🔍 POS Debug - hasOnlyNonWorkOrderProducts:",
        hasOnlyNonWorkOrderProducts,
      );

      // Verificar si hay un marco (frame) en el carrito
      const hasFrameInCart = cart.some((item) => {
        const product = item.product as any;
        return product?.product_type === "frame";
      });

      // Verificar si hay datos de lentes que requieren montaje
      const hasLensDataForMounting =
        (orderFormData.lens_family_id ||
          orderFormData.lens_type ||
          orderFormData.lens_material ||
          presbyopiaSolution !== "none") &&
        selectedPrescription?.id; // Solo requiere trabajo si hay receta asociada

      // Solo se requiere trabajo de laboratorio si:
      // 1. Hay items temporales de lentes/labor (siempre requieren trabajo)
      // 2. Hay un marco EN EL CARRITO Y hay datos de lentes para montar
      // Los productos de tipo "accessory", "sunglasses", "service", "lens" NO requieren trabajo
      // Si solo hay productos que no requieren trabajo, no se necesita cliente
      const requiresWorkOrder =
        !hasOnlyNonWorkOrderProducts &&
        (hasTemporaryLensItems || (hasFrameInCart && hasLensDataForMounting));

      if (requiresWorkOrder && !selectedCustomer?.id) {
        toast.error(
          "Se requiere un cliente registrado para crear trabajos de laboratorio",
        );
        setProcessingPayment(false);
        return;
      }

      // Calcular monto de pago según método
      let paymentAmount = total;
      let finalPaymentStatus: "paid" | "pending" | "partial" = "paid";

      if (paymentMethod === "cash") {
        if (isCashPartial) {
          // Efectivo parcial: usar monto parcial
          paymentAmount = cashPartialAmount;
          finalPaymentStatus = cashPartialAmount >= total ? "paid" : "partial";
        } else {
          // Efectivo completo: usar monto recibido
          paymentAmount = cashReceived;
          finalPaymentStatus = cashReceived >= total ? "paid" : "partial";
        }
      } else if (paymentMethod === "transfer") {
        paymentAmount = depositAmount;
        finalPaymentStatus = depositAmount >= total ? "paid" : "partial";
      } else if (
        paymentMethod === "debit_card" ||
        paymentMethod === "credit_card"
      ) {
        // Para tarjetas, si hay abono se usa ese monto, sino se paga el total
        paymentAmount = depositAmount > 0 ? depositAmount : total;
        finalPaymentStatus = paymentAmount >= total ? "paid" : "partial";
      }

      const orderData = {
        is_pos_sale: true,
        customer_id: selectedCustomer?.id || null, // Optional - allow sales without registered customer
        email: selectedCustomer?.email || null, // Only use customer email if available, otherwise null (optional)
        customer_name: selectedCustomer
          ? `${selectedCustomer.first_name || ""} ${selectedCustomer.last_name || ""}`.trim()
          : customerBusinessName || null,
        customer_rut: (() => {
          const raw =
            selectedCustomer?.rut ||
            (customerRUT && customerRUT.trim() !== "" ? customerRUT : null);
          if (!raw || typeof raw !== "string" || raw.trim() === "") return null;
          const completed = completeRUTIfNeeded(raw.trim());
          return isValidRUTFormat(completed) ? normalizeRUT(completed) : null;
        })(),
        payment_method_type: paymentMethod,
        payment_status: finalPaymentStatus,
        status: "delivered", // POS sales are immediately fulfilled
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        currency: "CLP", // Chilean Peso
        installments_count: 1, // Ya no se usa, mantener para compatibilidad
        sii_invoice_type: siiInvoiceType,
        sii_rut: (() => {
          const raw =
            selectedCustomer?.rut ||
            (customerRUT && customerRUT.trim() !== "" ? customerRUT : null);
          if (!raw || typeof raw !== "string" || raw.trim() === "") return null;
          const completed = completeRUTIfNeeded(raw.trim());
          return isValidRUTFormat(completed) ? normalizeRUT(completed) : null;
        })(),
        sii_business_name:
          selectedCustomer?.business_name || customerBusinessName || null,
        items: cart.map((item) => {
          const product = item.product as any;
          return {
            product_id:
              item.product.id.startsWith("lens-") ||
              item.product.id.startsWith("treatments-") ||
              item.product.id.startsWith("labor-") ||
              item.product.id.startsWith("frame-manual-") ||
              item.product.id.length > 36 // Filter IDs with timestamp suffix (e.g., "uuid-1234567890")
                ? null
                : item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.subtotal,
            product_type: product?.product_type || null, // Include product_type for backend processing
          };
        }),
        cash_received:
          paymentMethod === "cash"
            ? isCashPartial
              ? cashPartialAmount
              : cashReceived
            : paymentMethod === "transfer"
              ? depositAmount
              : null,
        change_amount:
          paymentMethod === "cash" && !isCashPartial
            ? Math.max(0, change)
            : null, // Ensure change is never negative (solo para efectivo completo)
        deposit_amount: paymentAmount < total ? paymentAmount : null, // Monto de abono si es pago parcial
        fiscal_reference: fiscalReference?.trim() || null,
        // Datos estructurados de lentes y marcos (solo para lentes ópticos)
        lens_data:
          lensType === "optical" &&
          (orderFormData.lens_family_id ||
            orderFormData.lens_type ||
            orderFormData.lens_material ||
            presbyopiaSolution !== "none")
            ? {
                lens_family_id:
                  presbyopiaSolution === "two_separate"
                    ? null
                    : orderFormData.lens_family_id || null,
                lens_type: orderFormData.lens_type || null,
                lens_material: orderFormData.lens_material || null,
                lens_index: orderFormData.lens_index || null,
                lens_treatments:
                  orderFormData.lens_treatments.length > 0
                    ? orderFormData.lens_treatments
                    : null,
                lens_tint_color: orderFormData.lens_tint_color || null,
                lens_tint_percentage:
                  orderFormData.lens_tint_percentage > 0
                    ? orderFormData.lens_tint_percentage
                    : null,
                prescription_id: selectedPrescription?.id || null,
              }
            : null,
        // Presbyopia solution data
        presbyopia_solution:
          presbyopiaSolution !== "none" ? presbyopiaSolution : null,
        far_lens_family_id:
          presbyopiaSolution === "two_separate"
            ? farLensFamilyId || null
            : null,
        near_lens_family_id:
          presbyopiaSolution === "two_separate"
            ? nearLensFamilyId || null
            : null,
        far_lens_cost:
          presbyopiaSolution === "two_separate" ? farLensCost || 0 : null,
        near_lens_cost:
          presbyopiaSolution === "two_separate" ? nearLensCost || 0 : null,
        // Contact lens fields
        contact_lens_family_id:
          lensType === "contact"
            ? orderFormData.contact_lens_family_id || null
            : null,
        // Usar receta seleccionada del cliente para lentes de contacto (no inputs manuales)
        contact_lens_rx_sphere_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_cylinder ?? null)
            : null,
        contact_lens_rx_axis_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_axis ?? null)
            : null,
        contact_lens_rx_add_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_add ?? null)
            : null,
        contact_lens_rx_base_curve_od:
          lensType === "contact"
            ? orderFormData.contact_lens_rx_base_curve_od
            : null,
        contact_lens_rx_diameter_od:
          lensType === "contact"
            ? orderFormData.contact_lens_rx_diameter_od
            : null,
        contact_lens_rx_sphere_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_cylinder ?? null)
            : null,
        contact_lens_rx_axis_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_axis ?? null)
            : null,
        contact_lens_rx_add_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_add ?? null)
            : null,
        contact_lens_rx_base_curve_os:
          lensType === "contact"
            ? orderFormData.contact_lens_rx_base_curve_os
            : null,
        contact_lens_rx_diameter_os:
          lensType === "contact"
            ? orderFormData.contact_lens_rx_diameter_os
            : null,
        contact_lens_quantity:
          lensType === "contact"
            ? orderFormData.contact_lens_quantity || 1
            : null,
        contact_lens_cost:
          lensType === "contact" ? orderFormData.contact_lens_cost || 0 : null,
        contact_lens_price:
          lensType === "contact" ? orderFormData.contact_lens_price || 0 : null,
        frame_data:
          orderFormData.frame_name || selectedFrame?.id
            ? {
                frame_product_id: selectedFrame?.id || null,
                frame_name: orderFormData.frame_name || null,
                frame_brand: orderFormData.frame_brand || null,
                frame_model: orderFormData.frame_model || null,
                frame_color: orderFormData.frame_color || null,
                frame_size: orderFormData.frame_size || null,
                frame_sku: orderFormData.frame_sku || null,
                customer_own_frame: customerOwnFrame || false,
              }
            : null,
        // Quote ID if sale comes from a quote
        quote_id: selectedQuote?.id || null,
      };

      // Use posService.processSale() instead of direct fetch
      // Cast orderData to ProcessSaleRequest to satisfy type requirements
      const result = await posService.processSale(
        orderData as unknown as import("@/lib/api/services").ProcessSaleRequest,
        currentBranchId || undefined,
      );

      // API returns null on error (e.g. stock insuficiente) - handleApiError already showed toast
      if (!result) {
        return;
      }

      // Support both work_order and order for backward compatibility
      const orderNumber =
        result?.work_order?.work_order_number || result?.order?.order_number;
      toast.success(
        orderNumber
          ? `Venta procesada: ${orderNumber}`
          : "Venta procesada correctamente",
      );

      // Print receipt (if printer available)
      const invoiceNumber =
        result?.work_order?.sii_invoice_number ||
        result?.order?.sii_invoice_number;
      if (invoiceNumber) {
        toast.info(`Factura: ${invoiceNumber}`);
      }

      // Clear cart and reset
      setReceiptType("sale");
      const orderToPrint =
        (result as any)?.order ||
        (result as any)?.work_order?.order ||
        (result as any)?.work_order;
      setLastProcessedOrder(orderToPrint);

      // Clear cart and reset
      clearCart();
      setShowPaymentDialog(false);

      // Trigger automatic print after React re-renders with new order (state update is async)
      if (billingSettings?.auto_print_receipt !== false) {
        setTimeout(printReceipt, 400);
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Error al procesar el pago");
    } finally {
      setProcessingPayment(false);
    }
  };

  const fetchPendingBalanceOrders = async () => {
    setLoadingPendingBalance(true);
    try {
      // Use currentBranchId, or first branch when in global view (ensures API gets branch filter)
      const branchForFetch =
        currentBranchId || (branches?.length ? branches[0]?.id : undefined);
      const orders = await posService.getPendingBalanceOrders(
        undefined,
        branchForFetch,
        500,
      );
      setAllPendingBalanceOrders(orders);
      filterPendingBalanceBySearch(pendingBalanceSearchTerm, orders);
    } catch (error: any) {
      console.error("Error fetching pending balance orders:", error);
      toast.error("Error al cargar órdenes pendientes");
      setAllPendingBalanceOrders([]);
      setPendingBalanceOrders([]);
    } finally {
      setLoadingPendingBalance(false);
    }
  };

  const filterPendingBalanceBySearch = (
    searchTerm: string,
    ordersToFilter: any[] = allPendingBalanceOrders,
  ) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setPendingBalanceOrders(ordersToFilter);
      return;
    }
    const filtered = ordersToFilter.filter((order: any) => {
      const orderNum = (order.order_number || "").toLowerCase();
      const email = (order.customer_email || "").toLowerCase();
      const name = (order.customer_name || "").toLowerCase();
      const rut = (order.customer_rut || "").toLowerCase();
      return (
        orderNum.includes(term) ||
        email.includes(term) ||
        name.includes(term) ||
        rut.includes(term)
      );
    });
    setPendingBalanceOrders(filtered);
  };

  const processPendingPayment = async () => {
    if (!selectedPendingOrder || !pendingPaymentAmount) {
      toast.error("Selecciona una orden e ingresa el monto");
      return;
    }

    const amount = parseFloat(pendingPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (amount > selectedPendingOrder.pending_amount) {
      toast.error(
        `El monto no puede ser mayor al saldo pendiente (${formatCurrency(selectedPendingOrder.pending_amount)})`,
      );
      return;
    }

    setProcessingPendingPayment(true);
    try {
      const result = await posService.processPendingPayment(
        {
          order_id: selectedPendingOrder.id,
          payment_amount: parseFloat(String(amount)),
          payment_method: String(pendingPaymentMethod),
          notes: `Pago de saldo pendiente en POS`,
          fiscal_reference: pendingFiscalReference?.trim() || undefined,
        },
        currentBranchId || undefined,
      );

      // Result is the data object from the response (unwrapped), so it doesn't have a .success property
      // If we got here, it means the request was successful because the service throws otherwise
      if (result) {
        toast.success(result.message || "Pago procesado exitosamente");
        setPendingPaymentAmount("");
        const orderId = selectedPendingOrder.id;
        const orderBranchId = selectedPendingOrder.branch_id;
        setSelectedPendingOrder(null);
        await fetchPendingBalanceOrders();

        // Fetch full order for receipt and trigger print (mismo formato que venta POS)
        try {
          const orderRes = await fetch(`/api/admin/orders/${orderId}`, {
            headers: getBranchHeader(orderBranchId || currentBranchId),
          });
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const fullOrder = orderData.order ?? orderData.data;
            if (fullOrder) {
              // Cargar billing settings de la sucursal de la orden para usar el formato guardado
              const receiptBranchId = fullOrder.branch_id || orderBranchId;
              if (receiptBranchId && receiptBranchId !== currentBranchId) {
                const orderBranchSettings =
                  await posService.getBillingSettings(receiptBranchId);
                if (orderBranchSettings)
                  setBillingSettings(orderBranchSettings);
              }
              setReceiptType("payment");
              setLastProcessedOrder(fullOrder);
              if (billingSettings?.auto_print_receipt !== false) {
                toast.info("Imprimiendo comprobante...");
                setTimeout(printReceipt, 400);
              }
            }
          }
        } catch (fetchErr) {
          console.warn("Could not fetch order for receipt:", fetchErr);
        }
      } else {
        toast.error("Error al procesar pago");
      }
    } catch (error: any) {
      console.error("Error processing pending payment:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setProcessingPendingPayment(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--admin-bg-primary)] pb-40 lg:pb-0">
      {/* Header - title, subtitle, Caja | Saldos (no card) */}
      <div className="border-b px-4 sm:px-6 py-3 sm:py-4 bg-[var(--admin-bg-primary)] flex-shrink-0">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <h1
              className="text-lg sm:text-2xl font-bold text-gray-900 truncate"
              data-tour="pos-header"
            >
              Punto de Venta (POS)
            </h1>
            <p className="text-sm text-gray-600">
              {!currentBranchId && isSuperAdmin
                ? "Sistema de ventas - Todas las sucursales"
                : "Sistema de ventas"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin/cash-register">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] sm:min-h-0"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Caja
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPendingBalanceDialog(true)}
              title="Cobrar saldos pendientes de órdenes"
              className="min-h-[44px] sm:min-h-0"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Saldos Pendientes</span>
              <span className="sm:hidden">Saldos</span>
            </Button>
          </div>
          {/* Desktop only: Total and Clear */}
          <div className="hidden lg:flex flex-row items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2"
            >
              Total: {formatCurrency(total)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="min-h-[40px] sm:min-h-0"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Cash Status Alert - desktop only; mobile uses fixed alert above Cobrar bar */}
      {!isSuperAdmin && currentBranchId && (
        <div
          className={`hidden lg:block px-4 sm:px-6 py-3 ${isCashOpen === false ? "bg-red-50 border-b border-red-200" : isCashOpen === true ? "bg-green-50 border-b border-green-200" : ""}`}
        >
          {checkingCashStatus ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando estado de caja...
            </div>
          ) : isCashOpen === false ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  <span className="font-semibold">La caja está cerrada</span>
                  <span className="hidden sm:inline">
                    {" "}
                    - Debe abrir la caja antes de realizar ventas
                  </span>
                </span>
              </div>
              <Link href="/admin/cash-register">
                <Button size="sm" variant="default">
                  Abrir Caja
                </Button>
              </Link>
            </div>
          ) : isCashOpen === true ? (
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>Caja abierta - Lista para realizar ventas</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Left Panel - Customer & Order Form (order-2 on mobile = below cart) */}
        <div className="w-full lg:w-2/3 flex flex-col border-r-0 lg:border-r overflow-hidden bg-[var(--admin-bg-primary)] min-h-0 order-2 lg:order-1">
          {/* Mobile: Tabs for sections | Desktop: all visible */}
          <div className="flex-1 overflow-y-auto p-4 bg-[var(--admin-bg-primary)] min-h-0">
            {/* Mobile-only: Section switcher - touch-friendly 44px min */}
            <div className="lg:hidden flex gap-2 mb-4">
              <Button
                type="button"
                variant={mainSectionTab === "cliente" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainSectionTab("cliente")}
                className="flex-1 min-h-[44px] text-xs sm:text-sm"
              >
                Cliente
              </Button>
              <Button
                type="button"
                variant={mainSectionTab === "productos" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainSectionTab("productos")}
                className="flex-1 min-h-[44px] text-xs sm:text-sm"
              >
                Productos
              </Button>
              <Button
                type="button"
                variant={mainSectionTab === "orden" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainSectionTab("orden")}
                className="flex-1 min-h-[44px] text-xs sm:text-sm"
              >
                Orden
              </Button>
            </div>
            <div className="space-y-4">
              {/* Customer Info - visible on mobile when tab=cliente, always on desktop */}
              <div
                className={
                  mainSectionTab === "cliente" ? "block" : "hidden lg:block"
                }
              >
                <Card className="bg-[var(--admin-bg-tertiary)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Customer Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        ref={
                          customerSearchInputRef as React.Ref<HTMLInputElement>
                        }
                        placeholder="Buscar cliente (nombre, email, teléfono, RUT)..."
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setSelectedCustomerIndex(-1);
                          // Si se borra el término de búsqueda, limpiar cliente seleccionado
                          if (e.target.value.trim().length === 0) {
                            setSelectedCustomer(null);
                            setCustomerBusinessName("");
                            setCustomerRUT("");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              selectedCustomerIndex >= 0 &&
                              customerSearchResults[selectedCustomerIndex]
                            ) {
                              handleSelectCustomer(
                                customerSearchResults[selectedCustomerIndex],
                              );
                            } else if (customerSearchResults.length > 0) {
                              handleSelectCustomer(customerSearchResults[0]);
                            }
                          } else if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setSelectedCustomerIndex((prev) =>
                              prev < customerSearchResults.length - 1
                                ? prev + 1
                                : prev,
                            );
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setSelectedCustomerIndex((prev) =>
                              prev > 0 ? prev - 1 : -1,
                            );
                          } else if (e.key === "Escape") {
                            setCustomerSearchResults([]);
                            setCustomerSearchTerm("");
                            setSelectedCustomerIndex(-1);
                          }
                        }}
                        className="pl-10"
                        autoComplete="off"
                      />
                    </div>

                    {/* Customer Search Results Dropdown */}
                    {customerSearchTerm.trim().length > 0 && (
                      <div className="relative">
                        {searchingCustomers && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg border">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        )}

                        {!searchingCustomers &&
                          customerSearchResults.length > 0 && (
                            <div
                              ref={
                                customerSuggestionsRef as React.Ref<HTMLDivElement>
                              }
                              className="max-h-60 overflow-y-auto border rounded-lg bg-white shadow-lg z-20"
                            >
                              {customerSearchResults.map((customer, index) => (
                                <button
                                  key={customer.id}
                                  onClick={() => handleSelectCustomer(customer)}
                                  onMouseEnter={() =>
                                    setSelectedCustomerIndex(index)
                                  }
                                  className={`w-full p-3 text-left border-b last:border-b-0 flex justify-between items-center transition-colors ${
                                    selectedCustomerIndex === index
                                      ? "bg-blue-50 border-blue-200"
                                      : "hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 truncate">
                                      {customer.name}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2">
                                      {customer.email && (
                                        <span>{customer.email}</span>
                                      )}
                                      {customer.phone && (
                                        <span>Tel: {customer.phone}</span>
                                      )}
                                      {customer.rut && (
                                        <span>RUT: {customer.rut}</span>
                                      )}
                                    </div>
                                  </div>
                                  {selectedCustomerIndex === index && (
                                    <div className="text-xs text-blue-600 ml-2">
                                      Enter
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                        {!searchingCustomers &&
                          !selectedCustomer &&
                          customerSearchTerm.trim().length > 0 &&
                          customerSearchResults.length === 0 && (
                            <div className="border rounded-lg bg-white p-3 text-center text-gray-500 text-sm">
                              <p>No se encontraron clientes</p>
                              <p className="text-xs mt-1">
                                Puedes continuar sin cliente o ingresar datos
                                manualmente
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Selected Customer Info or Manual Input */}
                    {selectedCustomer ? (
                      <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-green-900">
                              {selectedCustomer.name || selectedCustomer.email}
                            </div>
                            {selectedCustomer.rut && (
                              <div className="text-sm text-green-700 mt-1">
                                RUT: {selectedCustomer.rut}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerBusinessName("");
                              setCustomerRUT("");
                              setCustomerSearchTerm("");
                              setCustomerSearchResults([]);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {customerQuotes.length > 0 && (
                          <div className="mt-2 text-xs text-green-700">
                            {customerQuotes.length} presupuesto(s) disponible(s)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 bg-[var(--admin-bg-tertiary)]">
                        <div className="text-xs text-gray-500">
                          Cliente no seleccionado (opcional para ventas simples)
                        </div>
                        {/* Manual input fields for unregistered customers */}
                        <div>
                          <Label className="text-xs text-gray-600">
                            Nombre (opcional)
                          </Label>
                          <Input
                            type="text"
                            placeholder="Nombre del cliente"
                            value={customerBusinessName}
                            onChange={(e) =>
                              setCustomerBusinessName(e.target.value)
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">
                            RUT (opcional)
                          </Label>
                          <Input
                            type="text"
                            placeholder="Ej: 12.345.678-9"
                            value={customerRUT}
                            onChange={(e) => {
                              const formatted = formatRUT(e.target.value);
                              setCustomerRUT(formatted);
                            }}
                            className="text-sm font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* SII Invoice Type */}
                    <div>
                      <Label>Tipo de Documento</Label>
                      <Select
                        value={siiInvoiceType}
                        onValueChange={(v: any) => setSiiInvoiceType(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boleta">Boleta</SelectItem>
                          <SelectItem value="factura">Factura</SelectItem>
                          <SelectItem value="none">Sin Documento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {siiInvoiceType === "factura" && (
                      <div>
                        <Label>Razón Social</Label>
                        <Input
                          placeholder="Nombre de la empresa"
                          value={customerBusinessName}
                          onChange={(e) =>
                            setCustomerBusinessName(e.target.value)
                          }
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Product Search - visible on mobile when tab=productos */}
              <div
                className={
                  mainSectionTab === "productos" ? "block" : "hidden lg:block"
                }
              >
                <Card className="bg-[var(--admin-bg-tertiary)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <span className="flex items-center">
                        <Search className="h-5 w-5 mr-2" />
                        Búsqueda Rápida de Productos
                      </span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Busca accesorios, lentes de sol, servicios u otros
                      productos para agregar al carrito
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <POSBarcodeInput
                        value={searchTerm}
                        onChange={(v) => {
                          setSearchTerm(v);
                          setSelectedProductIndex(-1);
                        }}
                        onScan={handleBarcodeScan}
                        onSearch={() => {
                          if (
                            selectedProductIndex >= 0 &&
                            products[selectedProductIndex]
                          ) {
                            addToCart(products[selectedProductIndex]);
                          } else if (products.length > 0) {
                            addToCart(products[0]);
                          }
                        }}
                        onKeyDown={handleSearchKeyPress}
                        inputRef={searchInputRef}
                        placeholder="Escanear código o buscar (nombre, SKU)..."
                        className="h-12 text-base"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
                      )}
                    </div>

                    {/* Product Search Results */}
                    {searchTerm.trim().length > 0 && (
                      <div className="relative">
                        {searching && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg border">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        )}

                        {!searching && products.length > 0 && (
                          <div
                            ref={suggestionsRef as React.Ref<HTMLDivElement>}
                            className="max-h-96 overflow-y-auto border rounded-lg bg-white shadow-lg divide-y"
                          >
                            {products.map((product, index) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addToCart(product)}
                                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                                  index === selectedProductIndex
                                    ? "bg-gray-100 border-l-4 border-gray-400"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {product.name}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {product.brand && (
                                        <span className="mr-2">
                                          Marca: {product.brand}
                                        </span>
                                      )}
                                      {product.sku && (
                                        <span className="mr-2">
                                          SKU: {product.sku}
                                        </span>
                                      )}
                                      {product.category?.name && (
                                        <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">
                                          {product.category.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm font-semibold text-green-600 mt-1">
                                      {formatCurrency(product.price)}
                                      {product.price_includes_tax && (
                                        <span className="text-xs text-gray-500 ml-1">
                                          (IVA incluido)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(product);
                                      }}
                                      variant="default"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Agregar
                                    </Button>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {!searching &&
                          searchTerm.trim().length > 0 &&
                          products.length === 0 && (
                            <div className="border rounded-lg bg-white p-4 text-center text-gray-500">
                              <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p>No se encontraron productos</p>
                              <p className="text-xs mt-1">
                                Intenta con otro término de búsqueda
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Quick Tips */}
                    {searchTerm.trim().length === 0 && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="font-medium mb-1">
                          💡 Consejos de búsqueda:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>
                            Busca por nombre, marca, SKU o código de barras
                          </li>
                          <li>
                            Presiona Enter para agregar el primer resultado
                          </li>
                          <li>
                            Usa las flechas ↑↓ para navegar entre resultados
                          </li>
                          <li>Presiona Esc para limpiar la búsqueda</li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Complete Order Form - visible on mobile when tab=orden */}
              <div
                className={
                  mainSectionTab === "orden" ? "block" : "hidden lg:block"
                }
              >
                <Card className="bg-[var(--admin-bg-tertiary)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <span className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Crear Orden Completa
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      value={orderFormTab}
                      onValueChange={setOrderFormTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto min-h-[44px]">
                        <TabsTrigger
                          value="customer"
                          className="text-xs sm:text-sm py-2"
                        >
                          Cliente
                        </TabsTrigger>
                        <TabsTrigger
                          value="frame"
                          className="text-xs sm:text-sm py-2"
                        >
                          Marco
                        </TabsTrigger>
                        <TabsTrigger
                          value="lenses"
                          className="text-xs sm:text-sm py-2"
                        >
                          Lentes
                        </TabsTrigger>
                        <TabsTrigger
                          value="pricing"
                          className="text-xs sm:text-sm py-2"
                        >
                          Precios
                        </TabsTrigger>
                      </TabsList>

                      {/* Customer & Prescription Tab */}
                      <TabsContent value="customer" className="space-y-4 mt-4">
                        {/* Customer and Prescription Section */}
                        <Tabs defaultValue="customer" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 h-auto min-h-[40px]">
                            <TabsTrigger
                              value="customer"
                              className="text-xs sm:text-sm py-2"
                            >
                              Cliente & Receta
                            </TabsTrigger>
                            <TabsTrigger
                              value="prescription"
                              className="text-xs sm:text-sm py-2"
                            >
                              Receta Externa
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent
                            value="customer"
                            className="space-y-4 mt-4"
                          >
                            {/* Selected Customer Display */}
                            <div>
                              <Label>Cliente</Label>
                              {selectedCustomer ? (
                                <div className="mt-1 p-2 border rounded bg-gray-50">
                                  <div className="font-medium text-sm">
                                    {selectedCustomer.name ||
                                      selectedCustomer.email}
                                  </div>
                                  {selectedCustomer.rut && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      RUT: {selectedCustomer.rut}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-1 p-2 border rounded bg-gray-50 text-sm text-gray-500">
                                  Selecciona un cliente en el card superior
                                </div>
                              )}
                            </div>

                            {/* Prescription Selection */}
                            {selectedCustomer && (
                              <div>
                                <Label>Receta</Label>
                                {(() => {
                                  const prescriptionsList =
                                    prescriptions.length > 0
                                      ? prescriptions
                                      : selectedPrescription
                                        ? [selectedPrescription]
                                        : [];
                                  if (prescriptionsList.length === 0) {
                                    return (
                                      <div className="text-sm text-gray-500 py-2">
                                        Este cliente no tiene recetas
                                        registradas.
                                      </div>
                                    );
                                  }
                                  return (
                                    <Select
                                      value={selectedPrescription?.id || ""}
                                      onValueChange={(value) => {
                                        const prescription =
                                          prescriptionsList.find(
                                            (p) => p.id === value,
                                          );
                                        setSelectedPrescription(
                                          prescription || null,
                                        );
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una receta" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {prescriptionsList.map(
                                          (prescription) => (
                                            <SelectItem
                                              key={prescription.id}
                                              value={prescription.id}
                                            >
                                              {prescription.prescription_date
                                                ? formatDate(
                                                    prescription.prescription_date,
                                                  )
                                                : "Sin fecha"}
                                              {prescription.issued_by &&
                                                ` - ${prescription.issued_by}`}
                                              {prescription.is_current &&
                                                " (Actual)"}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Resumen de receta (mediciones) cuando hay receta seleccionada */}
                            {selectedPrescription && (
                              <div className="p-4 border rounded-lg bg-blue-50 text-blue-900">
                                <p className="font-medium mb-2 text-sm">
                                  Resumen de Receta
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="font-semibold">OD:</span>{" "}
                                    Esf {selectedPrescription.od_sphere ?? "—"}{" "}
                                    / Cil{" "}
                                    {selectedPrescription.od_cylinder ?? "—"}
                                    {selectedPrescription.od_axis != null && (
                                      <span>
                                        {" "}
                                        Eje {selectedPrescription.od_axis}°
                                      </span>
                                    )}
                                    {selectedPrescription.od_add != null &&
                                      selectedPrescription.od_add > 0 && (
                                        <span className="ml-2 text-orange-600">
                                          Add: +{selectedPrescription.od_add}
                                        </span>
                                      )}
                                  </div>
                                  <div>
                                    <span className="font-semibold">OS:</span>{" "}
                                    Esf {selectedPrescription.os_sphere ?? "—"}{" "}
                                    / Cil{" "}
                                    {selectedPrescription.os_cylinder ?? "—"}
                                    {selectedPrescription.os_axis != null && (
                                      <span>
                                        {" "}
                                        Eje {selectedPrescription.os_axis}°
                                      </span>
                                    )}
                                    {selectedPrescription.os_add != null &&
                                      selectedPrescription.os_add > 0 && (
                                        <span className="ml-2 text-orange-600">
                                          Add: +{selectedPrescription.os_add}
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Quote Selection */}
                            <div>
                              <Label>Presupuesto</Label>
                              {!selectedCustomer ? (
                                <div className="text-sm text-gray-500 py-2">
                                  Selecciona un cliente para ver sus
                                  presupuestos
                                </div>
                              ) : loadingQuotes ? (
                                <div className="text-sm text-gray-500 py-2 flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Cargando presupuestos...
                                </div>
                              ) : customerQuotes.length === 0 ? (
                                <div className="text-sm text-gray-500 py-2">
                                  Este cliente no tiene presupuestos. Puedes
                                  crear una orden manualmente.
                                </div>
                              ) : (
                                <Select
                                  value={selectedQuote?.id || "__none__"}
                                  onValueChange={async (value) => {
                                    if (value === "__none__") {
                                      setSelectedQuote(null);
                                      resetCompleteOrderForm();
                                      return;
                                    }
                                    const quote = customerQuotes.find(
                                      (q) => q.id === value,
                                    );
                                    if (quote) {
                                      await handleLoadQuoteToForm(quote);
                                    } else {
                                      setSelectedQuote(null);
                                      resetCompleteOrderForm();
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un presupuesto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">
                                      Ninguno / Sin presupuesto
                                    </SelectItem>
                                    {customerQuotes.map((quote) => (
                                      <SelectItem
                                        key={quote.id}
                                        value={quote.id}
                                      >
                                        {quote.quote_number} -{" "}
                                        {formatDate(quote.created_at)}
                                        {quote.status && ` (${quote.status})`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent
                            value="prescription"
                            className="space-y-4 mt-4"
                          >
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Cliente nuevo con receta externa. Completa los
                                datos del cliente y su receta.
                              </AlertDescription>
                            </Alert>

                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Nombre *</Label>
                                  <Input
                                    placeholder="Juan"
                                    value={externalCustomerData.first_name}
                                    onChange={(e) =>
                                      setExternalCustomerData((prev) => ({
                                        ...prev,
                                        first_name: e.target.value,
                                      }))
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label>Apellido *</Label>
                                  <Input
                                    placeholder="Pérez"
                                    value={externalCustomerData.last_name}
                                    onChange={(e) =>
                                      setExternalCustomerData((prev) => ({
                                        ...prev,
                                        last_name: e.target.value,
                                      }))
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>RUT *</Label>
                                  <Input
                                    placeholder="12345678-9"
                                    value={externalCustomerData.rut}
                                    onChange={(e) => {
                                      const formatted = formatRUT(
                                        e.target.value,
                                      );
                                      setExternalCustomerData((prev) => ({
                                        ...prev,
                                        rut: formatted,
                                      }));
                                    }}
                                    className="h-9 text-sm"
                                    maxLength={12}
                                  />
                                </div>
                                <div>
                                  <Label>Teléfono</Label>
                                  <Input
                                    placeholder="+56 9 1234 5678"
                                    value={externalCustomerData.phone}
                                    onChange={(e) =>
                                      setExternalCustomerData((prev) => ({
                                        ...prev,
                                        phone: e.target.value,
                                      }))
                                    }
                                    className="h-9 text-sm"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label>Email</Label>
                                <Input
                                  type="email"
                                  placeholder="cliente@ejemplo.com"
                                  value={externalCustomerData.email}
                                  onChange={(e) =>
                                    setExternalCustomerData((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  className="h-9 text-sm"
                                />
                              </div>

                              <Separator className="my-4" />

                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold">
                                  Datos de la Receta Externa
                                </h4>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Fecha de Receta</Label>
                                    <Input
                                      type="date"
                                      value={
                                        externalPrescriptionData.prescription_date
                                      }
                                      onChange={(e) =>
                                        setExternalPrescriptionData((prev) => ({
                                          ...prev,
                                          prescription_date: e.target.value,
                                        }))
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label>Fecha de Vencimiento</Label>
                                    <Input
                                      type="date"
                                      value={
                                        externalPrescriptionData.expiration_date
                                      }
                                      onChange={(e) =>
                                        setExternalPrescriptionData((prev) => ({
                                          ...prev,
                                          expiration_date: e.target.value,
                                        }))
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Número de Receta</Label>
                                    <Input
                                      placeholder="12345"
                                      value={
                                        externalPrescriptionData.prescription_number
                                      }
                                      onChange={(e) =>
                                        setExternalPrescriptionData((prev) => ({
                                          ...prev,
                                          prescription_number: e.target.value,
                                        }))
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label>Emitida por</Label>
                                    <Input
                                      placeholder="Dr. Juan Pérez"
                                      value={externalPrescriptionData.issued_by}
                                      onChange={(e) =>
                                        setExternalPrescriptionData((prev) => ({
                                          ...prev,
                                          issued_by: e.target.value,
                                        }))
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>

                                <Separator className="my-4" />

                                <div className="space-y-3">
                                  <h5 className="text-xs font-semibold text-gray-700">
                                    Ojo Derecho (OD)
                                  </h5>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <Label className="text-xs">Esfera</Label>
                                      <Input
                                        placeholder="-2.00"
                                        value={
                                          externalPrescriptionData.od_sphere
                                        }
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              od_sphere: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Cilindro
                                      </Label>
                                      <Input
                                        placeholder="-0.50"
                                        value={
                                          externalPrescriptionData.od_cylinder
                                        }
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              od_cylinder: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Eje</Label>
                                      <Input
                                        placeholder="180"
                                        value={externalPrescriptionData.od_axis}
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              od_axis: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Adición</Label>
                                      <Input
                                        placeholder="+2.00"
                                        value={externalPrescriptionData.od_add}
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              od_add: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h5 className="text-xs font-semibold text-gray-700">
                                    Ojo Izquierdo (OS)
                                  </h5>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <Label className="text-xs">Esfera</Label>
                                      <Input
                                        placeholder="-2.00"
                                        value={
                                          externalPrescriptionData.os_sphere
                                        }
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              os_sphere: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Cilindro
                                      </Label>
                                      <Input
                                        placeholder="-0.50"
                                        value={
                                          externalPrescriptionData.os_cylinder
                                        }
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              os_cylinder: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Eje</Label>
                                      <Input
                                        placeholder="180"
                                        value={externalPrescriptionData.os_axis}
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              os_axis: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Adición</Label>
                                      <Input
                                        placeholder="+2.00"
                                        value={externalPrescriptionData.os_add}
                                        onChange={(e) =>
                                          setExternalPrescriptionData(
                                            (prev) => ({
                                              ...prev,
                                              os_add: e.target.value,
                                            }),
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">
                                      DP (Distancia Pupilar)
                                    </Label>
                                    <Input
                                      placeholder="64"
                                      value={externalPrescriptionData.pd}
                                      onChange={(e) =>
                                        setExternalPrescriptionData((prev) => ({
                                          ...prev,
                                          pd: e.target.value,
                                        }))
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">DP Cerca</Label>
                                    <Input
                                      placeholder="62"
                                      value={externalPrescriptionData.near_pd}
                                      onChange={(e) =>
                                        setExternalPrescriptionData((prev) => ({
                                          ...prev,
                                          near_pd: e.target.value,
                                        }))
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  onClick={
                                    handleCreateExternalCustomerWithPrescription
                                  }
                                  disabled={creatingExternalCustomer}
                                  className="w-full"
                                  size="sm"
                                >
                                  {creatingExternalCustomer ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Creando...
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Crear Cliente y Receta
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </TabsContent>

                      {/* Frame Tab */}
                      <TabsContent value="frame" className="space-y-4 mt-4">
                        <div>
                          <Label>Marco</Label>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id="customer_own_frame_pos"
                              checked={customerOwnFrame}
                              onChange={(e) => {
                                setCustomerOwnFrame(e.target.checked);
                                if (e.target.checked) {
                                  setSelectedFrame(null);
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    frame_price: 0,
                                    frame_cost: 0,
                                  }));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label
                              htmlFor="customer_own_frame_pos"
                              className="cursor-pointer text-sm"
                            >
                              Cliente trae marco (recambio de cristales)
                            </Label>
                          </div>
                          {!customerOwnFrame ? (
                            <>
                              {selectedFrame ? (
                                <div className="flex items-center justify-between p-2 border rounded mt-1">
                                  <div>
                                    <div className="font-medium text-sm">
                                      {selectedFrame.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {formatCurrency(
                                        orderFormData.frame_price,
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedFrame(null);
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        frame_price: 0,
                                        frame_cost: 0,
                                      }));
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="relative mt-1">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="Buscar marco..."
                                    value={frameSearch}
                                    onChange={(e) =>
                                      setFrameSearch(e.target.value)
                                    }
                                    className="pl-8 h-9 text-sm"
                                  />
                                  {frameSearch.length >= 2 &&
                                    frameResults.length > 0 && (
                                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {frameResults.map((frame) => (
                                          <div
                                            key={frame.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer border-b text-sm"
                                            onClick={() =>
                                              handleFrameSelectForOrder(frame)
                                            }
                                          >
                                            <div className="font-medium">
                                              {frame.name}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              {formatCurrency(frame.price)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              )}
                              {!selectedFrame && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <Input
                                    placeholder="Nombre marco"
                                    value={orderFormData.frame_name}
                                    onChange={(e) =>
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        frame_name: e.target.value,
                                      }))
                                    }
                                    className="h-9 text-sm"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Precio"
                                    value={orderFormData.frame_price || ""}
                                    onChange={(e) => {
                                      const price =
                                        parseFloat(e.target.value) || 0;
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        frame_price: price,
                                        frame_cost: price,
                                      }));
                                    }}
                                    className="h-9 text-sm"
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Nombre marco del cliente"
                                value={orderFormData.frame_name}
                                onChange={(e) =>
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    frame_name: e.target.value,
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                              <div className="text-xs text-gray-500 flex items-center">
                                Precio: $0 (cliente trae marco)
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Lenses Tab */}
                      <TabsContent value="lenses" className="space-y-4 mt-4">
                        {/* Presbyopia Solution Selector */}
                        {selectedPrescription &&
                          hasAddition(selectedPrescription) && (
                            <div className="space-y-3 p-3 border rounded-lg bg-orange-50">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <Label className="text-sm font-medium">
                                  Presbicia detectada (+
                                  {getMaxAddition(selectedPrescription)} D)
                                </Label>
                              </div>
                              <RadioGroup
                                value={presbyopiaSolution}
                                onValueChange={(value) => {
                                  const solution = value as PresbyopiaSolution;
                                  setPresbyopiaSolution(solution);
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    presbyopia_solution: solution,
                                  }));
                                  if (
                                    solution === "progressive" ||
                                    solution === "bifocal" ||
                                    solution === "trifocal"
                                  ) {
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      lens_type: solution,
                                    }));
                                  }
                                  // Reset lens families when changing solution
                                  if (solution !== "two_separate") {
                                    setFarLensFamilyId("");
                                    setNearLensFamilyId("");
                                    setSelectedNearFrame(null);
                                    setCustomerOwnNearFrame(false);
                                    setNearFrameSearch("");
                                    setNearFrameResults([]);
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      far_lens_family_id: "",
                                      near_lens_family_id: "",
                                      far_lens_cost: 0,
                                      near_lens_cost: 0,
                                      near_frame_product_id: "",
                                      near_frame_name: "",
                                      near_frame_brand: "",
                                      near_frame_model: "",
                                      near_frame_color: "",
                                      near_frame_size: "",
                                      near_frame_sku: "",
                                      near_frame_price: 0,
                                      near_frame_price_includes_tax: false,
                                      near_frame_cost: 0,
                                    }));
                                  }
                                }}
                                className="space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value="progressive"
                                    id="pos-progressive"
                                  />
                                  <Label
                                    htmlFor="pos-progressive"
                                    className="cursor-pointer text-sm"
                                  >
                                    Progresivo
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value="bifocal"
                                    id="pos-bifocal"
                                  />
                                  <Label
                                    htmlFor="pos-bifocal"
                                    className="cursor-pointer text-sm"
                                  >
                                    Bifocal
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value="two_separate"
                                    id="pos-two-separate"
                                  />
                                  <Label
                                    htmlFor="pos-two-separate"
                                    className="cursor-pointer text-sm"
                                  >
                                    Dos lentes separados
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          )}

                        {/* Two Separate Lenses Layout - Improved with clear sections */}
                        {presbyopiaSolution === "two_separate" ? (
                          <div className="space-y-6">
                            {/* Section 1: Far Vision (Lejos) */}
                            <Card className="border-2 border-blue-200 bg-blue-50/30">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center text-blue-900">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Marco y Lente de Lejos (Visión Lejana)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Far Frame - Already selected above, show summary */}
                                <div className="p-2 bg-white rounded border">
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    Marco de Lejos:
                                  </div>
                                  {selectedFrame ? (
                                    <div className="text-sm">
                                      {selectedFrame.name} -{" "}
                                      {formatCurrency(
                                        orderFormData.frame_price,
                                      )}
                                    </div>
                                  ) : customerOwnFrame ? (
                                    <div className="text-sm text-gray-600">
                                      {orderFormData.frame_name ||
                                        "Cliente trae marco"}{" "}
                                      - $0
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      {orderFormData.frame_name ||
                                        "Sin marco seleccionado"}{" "}
                                      -{" "}
                                      {formatCurrency(
                                        orderFormData.frame_price,
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Far Lens Family */}
                                <div>
                                  <Label className="text-sm font-medium">
                                    Familia de Lente de Lejos
                                  </Label>
                                  <LensFamilyCombobox
                                    value={farLensFamilyId || ""}
                                    onChange={(familyId) => {
                                      setFarLensFamilyId(familyId);
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        far_lens_family_id: familyId,
                                      }));
                                    }}
                                    presbyopiaSolution="two_separate"
                                    families={lensFamilies}
                                    loading={loadingFamilies}
                                    placeholder="Selecciona familia de lente"
                                    className="h-9 text-sm"
                                  />
                                  {farLensCost > 0 && (
                                    <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded">
                                      <p className="text-xs font-medium text-green-800">
                                        Precio Lente de Lejos:{" "}
                                        {formatCurrency(farLensCost)}
                                      </p>
                                    </div>
                                  )}
                                  {!farLensFamilyId && (
                                    <div className="mt-2">
                                      <Label className="text-sm">
                                        Costo del Lente de Lejos (Manual)
                                      </Label>
                                      <Input
                                        type="number"
                                        placeholder="Ej: 30000"
                                        value={
                                          orderFormData.far_lens_cost || ""
                                        }
                                        onChange={(e) => {
                                          const newValue =
                                            parseFloat(e.target.value) || 0;
                                          setOrderFormData((prev) => ({
                                            ...prev,
                                            far_lens_cost: newValue,
                                          }));
                                          setFarLensCost(newValue);
                                        }}
                                        className="h-9 text-sm mt-1"
                                      />
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Section 2: Near Vision (Cerca) */}
                            <Card className="border-2 border-purple-200 bg-purple-50/30">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center text-purple-900">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Marco y Lente de Cerca (Visión Cercana)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Near Frame Selection */}
                                <div>
                                  <Label className="text-sm font-medium">
                                    Marco de Cerca
                                  </Label>
                                  <div className="flex items-center gap-2 mb-2 mt-1">
                                    <input
                                      type="checkbox"
                                      id="customer_own_near_frame_pos"
                                      checked={customerOwnNearFrame}
                                      onChange={(e) => {
                                        setCustomerOwnNearFrame(
                                          e.target.checked,
                                        );
                                        if (e.target.checked) {
                                          setSelectedNearFrame(null);
                                          setOrderFormData((prev) => ({
                                            ...prev,
                                            near_frame_price: 0,
                                            near_frame_cost: 0,
                                          }));
                                        }
                                      }}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label
                                      htmlFor="customer_own_near_frame_pos"
                                      className="cursor-pointer text-sm"
                                    >
                                      Cliente trae marco (recambio de cristales)
                                    </Label>
                                  </div>
                                  {!customerOwnNearFrame ? (
                                    <>
                                      {selectedNearFrame ? (
                                        <div className="flex items-center justify-between p-2 border rounded bg-white">
                                          <div>
                                            <div className="font-medium text-sm">
                                              {selectedNearFrame.name}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              {formatCurrency(
                                                orderFormData.near_frame_price,
                                              )}
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedNearFrame(null);
                                              setOrderFormData((prev) => ({
                                                ...prev,
                                                near_frame_price: 0,
                                                near_frame_cost: 0,
                                              }));
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="relative">
                                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                          <Input
                                            placeholder="Buscar marco de cerca..."
                                            value={nearFrameSearch}
                                            onChange={(e) =>
                                              setNearFrameSearch(e.target.value)
                                            }
                                            className="pl-8 h-9 text-sm"
                                          />
                                          {nearFrameSearch.length >= 2 &&
                                            nearFrameResults.length > 0 && (
                                              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {nearFrameResults.map(
                                                  (frame) => (
                                                    <div
                                                      key={frame.id}
                                                      className="p-2 hover:bg-gray-100 cursor-pointer border-b text-sm"
                                                      onClick={() =>
                                                        handleNearFrameSelectForOrder(
                                                          frame,
                                                        )
                                                      }
                                                    >
                                                      <div className="font-medium">
                                                        {frame.name}
                                                      </div>
                                                      <div className="text-xs text-gray-600">
                                                        {formatCurrency(
                                                          frame.price,
                                                        )}
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      )}
                                      {!selectedNearFrame && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                          <Input
                                            placeholder="Nombre marco de cerca"
                                            value={
                                              orderFormData.near_frame_name
                                            }
                                            onChange={(e) =>
                                              setOrderFormData((prev) => ({
                                                ...prev,
                                                near_frame_name: e.target.value,
                                              }))
                                            }
                                            className="h-9 text-sm"
                                          />
                                          <Input
                                            type="number"
                                            placeholder="Precio"
                                            value={
                                              orderFormData.near_frame_price ||
                                              ""
                                            }
                                            onChange={(e) => {
                                              const price =
                                                parseFloat(e.target.value) || 0;
                                              setOrderFormData((prev) => ({
                                                ...prev,
                                                near_frame_price: price,
                                                near_frame_cost: price,
                                              }));
                                            }}
                                            className="h-9 text-sm"
                                          />
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="Nombre marco del cliente"
                                        value={orderFormData.near_frame_name}
                                        onChange={(e) =>
                                          setOrderFormData((prev) => ({
                                            ...prev,
                                            near_frame_name: e.target.value,
                                          }))
                                        }
                                        className="h-9 text-sm"
                                      />
                                      <div className="text-xs text-gray-500 flex items-center">
                                        Precio: $0 (cliente trae marco)
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Near Lens Family */}
                                <div>
                                  <Label className="text-sm font-medium">
                                    Familia de Lente de Cerca
                                  </Label>
                                  <LensFamilyCombobox
                                    value={nearLensFamilyId || ""}
                                    onChange={(familyId) => {
                                      setNearLensFamilyId(familyId);
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        near_lens_family_id: familyId,
                                      }));
                                    }}
                                    presbyopiaSolution="two_separate"
                                    families={lensFamilies}
                                    loading={loadingFamilies}
                                    placeholder="Selecciona familia de lente"
                                    className="h-9 text-sm"
                                  />
                                  {nearLensCost > 0 && (
                                    <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded">
                                      <p className="text-xs font-medium text-green-800">
                                        Precio Lente de Cerca:{" "}
                                        {formatCurrency(nearLensCost)}
                                      </p>
                                    </div>
                                  )}
                                  {!nearLensFamilyId && (
                                    <div className="mt-2">
                                      <Label className="text-sm">
                                        Costo del Lente de Cerca (Manual)
                                      </Label>
                                      <Input
                                        type="number"
                                        placeholder="Ej: 30000"
                                        value={
                                          orderFormData.near_lens_cost || ""
                                        }
                                        onChange={(e) => {
                                          const newValue =
                                            parseFloat(e.target.value) || 0;
                                          setOrderFormData((prev) => ({
                                            ...prev,
                                            near_lens_cost: newValue,
                                          }));
                                          setNearLensCost(newValue);
                                        }}
                                        className="h-9 text-sm mt-1"
                                      />
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ) : null}

                        {/* Lens Type Toggle: Optical vs Contact */}
                        {presbyopiaSolution !== "two_separate" && (
                          <div className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
                            <Label className="font-medium text-sm">
                              Tipo de Lente:
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={
                                  lensType === "optical" ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => {
                                  setLensType("optical");
                                  // Reset contact lens fields when switching to optical
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    contact_lens_family_id: "",
                                    contact_lens_quantity: 1,
                                    contact_lens_cost: 0,
                                    contact_lens_price: 0,
                                  }));
                                }}
                              >
                                Lentes Ópticos
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  lensType === "contact" ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => {
                                  setLensType("contact");
                                  // Reset optical lens fields when switching to contact
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    lens_family_id: "",
                                    lens_cost: 0,
                                  }));
                                }}
                              >
                                Lentes de Contacto
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Contact Lens Configuration */}
                        {presbyopiaSolution !== "two_separate" &&
                        lensType === "contact" ? (
                          <div className="space-y-4">
                            <div>
                              <Label>Familia de Lentes de Contacto</Label>
                              <ContactLensFamilyCombobox
                                value={
                                  orderFormData.contact_lens_family_id || ""
                                }
                                onChange={(value) => {
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    contact_lens_family_id: value,
                                    contact_lens_cost: 0,
                                    contact_lens_price: 0,
                                  }));
                                }}
                                families={contactLensFamilies}
                                loading={loadingContactLensFamilies}
                                categorySlug="lentes-contacto"
                                className="h-9 text-sm"
                              />
                            </div>

                            {orderFormData.contact_lens_family_id && (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm">
                                      Cantidad de Cajas
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={
                                        orderFormData.contact_lens_quantity || 1
                                      }
                                      onChange={(e) => {
                                        const quantity =
                                          parseInt(e.target.value) || 1;
                                        setOrderFormData((prev) => ({
                                          ...prev,
                                          contact_lens_quantity: quantity,
                                        }));
                                      }}
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm">
                                      Precio Total
                                    </Label>
                                    <Input
                                      type="number"
                                      value={
                                        orderFormData.contact_lens_price || ""
                                      }
                                      onChange={(e) => {
                                        const price =
                                          parseFloat(e.target.value) || 0;
                                        setOrderFormData((prev) => ({
                                          ...prev,
                                          contact_lens_price: price,
                                        }));
                                      }}
                                      placeholder="Se calcula automáticamente"
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>
                                {calculatingContactLensPrice && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>
                                      Calculando precio del lente de contacto...
                                    </span>
                                  </div>
                                )}
                                {orderFormData.contact_lens_price > 0 && (
                                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                                    <p className="text-xs font-medium text-green-800">
                                      Precio Total:{" "}
                                      {formatCurrency(
                                        orderFormData.contact_lens_price,
                                      )}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}

                            {!orderFormData.contact_lens_family_id && (
                              <div>
                                <Label className="text-sm">
                                  Costo del Lente de Contacto (Manual)
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="Ej: 30000"
                                  value={orderFormData.contact_lens_cost || ""}
                                  onChange={(e) => {
                                    const newValue =
                                      parseFloat(e.target.value) || 0;
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      contact_lens_cost: newValue,
                                      contact_lens_price: newValue,
                                    }));
                                  }}
                                  className="h-9 text-sm mt-1"
                                />
                              </div>
                            )}

                            {/* Las mediciones de receta para lentes de contacto se toman de la receta seleccionada del cliente (Resumen de Receta arriba). */}
                          </div>
                        ) : presbyopiaSolution !== "two_separate" &&
                          lensType === "optical" ? (
                          /* Optical Lens Configuration (existing code) */
                          <>
                            {/* Single Lens Family Selection */}
                            <div>
                              <Label>Familia de Lentes</Label>
                              <LensFamilyCombobox
                                value={orderFormData.lens_family_id || ""}
                                onChange={(value) => {
                                  setOrderFormData((prev) => ({
                                    ...prev,
                                    lens_family_id: value,
                                  }));
                                  setManualLensPrice(false);
                                }}
                                presbyopiaSolution={presbyopiaSolution}
                                families={lensFamilies}
                                loading={loadingFamilies}
                                placeholder="Selecciona una familia (opcional)"
                                className="h-9 text-sm"
                              />
                            </div>

                            {/* Lens Configuration */}
                            <div>
                              <Label>Tipo de Lente *</Label>
                              {orderFormData.lens_family_id ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-1">
                                  <p className="text-sm text-blue-800">
                                    Tipo: {orderFormData.lens_type || "—"} ·
                                    Material:{" "}
                                    {orderFormData.lens_material || "—"}{" "}
                                    (heredados de la familia)
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2 mt-1">
                                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-xs text-yellow-800">
                                      No hay familia seleccionada. Ingresa el
                                      precio del lente manualmente.
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm">
                                      Costo del Lente
                                    </Label>
                                    <Input
                                      type="number"
                                      placeholder="Ej: 30000"
                                      value={orderFormData.lens_cost || ""}
                                      onChange={(e) => {
                                        const newValue =
                                          parseFloat(e.target.value) || 0;
                                        setOrderFormData((prev) => ({
                                          ...prev,
                                          lens_cost: newValue,
                                        }));
                                      }}
                                      className="h-9 text-sm mt-1"
                                    />
                                  </div>
                                </div>
                              )}
                              {orderFormData.lens_index && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Índice: {orderFormData.lens_index}
                                </div>
                              )}
                              {orderFormData.lens_family_id &&
                                orderFormData.lens_cost > 0 && (
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="text-xs text-gray-600">
                                      Costo lente:{" "}
                                      {formatCurrency(orderFormData.lens_cost)}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs"
                                      onClick={() =>
                                        setManualLensPrice(!manualLensPrice)
                                      }
                                    >
                                      {manualLensPrice ? "Auto" : "Manual"}
                                    </Button>
                                  </div>
                                )}
                              {orderFormData.lens_family_id &&
                                manualLensPrice && (
                                  <div className="mt-2">
                                    <Label className="text-sm">
                                      Costo del Lente (Manual)
                                    </Label>
                                    <Input
                                      type="number"
                                      placeholder="Ej: 30000"
                                      value={orderFormData.lens_cost || ""}
                                      onChange={(e) => {
                                        const newValue =
                                          parseFloat(e.target.value) || 0;
                                        setOrderFormData((prev) => ({
                                          ...prev,
                                          lens_cost: newValue,
                                        }));
                                      }}
                                      className="h-9 text-sm mt-1"
                                    />
                                  </div>
                                )}
                              {calculatingPrice && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Calculando precio...
                                </div>
                              )}
                            </div>
                          </>
                        ) : null}

                        {/* Treatments */}
                        {/* Hide treatments when two_separate solution or contact lenses */}
                        {presbyopiaSolution !== "two_separate" &&
                          lensType === "optical" && (
                            <>
                              {/* Show all treatments when no family is selected */}
                              {!orderFormData.lens_family_id && (
                                <div>
                                  <Label>Tratamientos</Label>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {availableTreatments
                                      .slice(0, 6)
                                      .map((treatment) => (
                                        <Button
                                          key={treatment.value}
                                          type="button"
                                          variant={
                                            orderFormData.lens_treatments.includes(
                                              treatment.value,
                                            )
                                              ? "default"
                                              : "outline"
                                          }
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() =>
                                            handleTreatmentToggle(treatment)
                                          }
                                        >
                                          {treatment.label}
                                        </Button>
                                      ))}
                                  </div>
                                  {orderFormData.treatments_cost > 0 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Costo tratamientos:{" "}
                                      {formatCurrency(
                                        orderFormData.treatments_cost,
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Show only extras when family is selected */}
                              {orderFormData.lens_family_id && (
                                <div>
                                  <Label>Extras</Label>
                                  <div className="text-xs text-gray-500 mb-2">
                                    Los tratamientos estándar están incluidos en
                                    la familia. Solo extras:
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {availableTreatments
                                      .filter(
                                        (t) =>
                                          t.value === "tint" ||
                                          t.value === "prism_extra",
                                      )
                                      .map((treatment) => (
                                        <Button
                                          key={treatment.value}
                                          type="button"
                                          variant={
                                            orderFormData.lens_treatments.includes(
                                              treatment.value,
                                            )
                                              ? "default"
                                              : "outline"
                                          }
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() =>
                                            handleTreatmentToggle(treatment)
                                          }
                                        >
                                          {treatment.label}
                                        </Button>
                                      ))}
                                  </div>
                                  {orderFormData.treatments_cost > 0 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Costo extras:{" "}
                                      {formatCurrency(
                                        orderFormData.treatments_cost,
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                      </TabsContent>

                      {/* Pricing Tab */}
                      <TabsContent value="pricing" className="space-y-4 mt-4">
                        {/* Labor Cost */}
                        <div>
                          <Label>Mano de Obra</Label>
                          <Input
                            type="number"
                            placeholder="15000"
                            value={orderFormData.labor_cost || ""}
                            onChange={(e) =>
                              setOrderFormData((prev) => ({
                                ...prev,
                                labor_cost: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="h-9 text-sm"
                          />
                        </div>

                        {/* Discount */}
                        <div className="space-y-2">
                          <Label>Tipo de Descuento</Label>
                          <Select
                            value={discountType}
                            onValueChange={(value: "percentage" | "amount") => {
                              setDiscountType(value);
                              // Clear the other discount field when switching types
                              if (value === "percentage") {
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  discount_amount: 0,
                                }));
                              } else {
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  discount_percentage: 0,
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                Por Porcentaje (%)
                              </SelectItem>
                              <SelectItem value="amount">
                                Por Valor ($)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div>
                            <Label>
                              {discountType === "percentage"
                                ? "Descuento (%)"
                                : "Descuento ($)"}
                            </Label>
                            <Input
                              type="number"
                              placeholder="0"
                              min="0"
                              max={
                                discountType === "percentage"
                                  ? "100"
                                  : undefined
                              }
                              step={
                                discountType === "percentage" ? "0.01" : "1"
                              }
                              value={
                                discountType === "percentage"
                                  ? orderFormData.discount_percentage || ""
                                  : orderFormData.discount_amount || ""
                              }
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  [discountType === "percentage"
                                    ? "discount_percentage"
                                    : "discount_amount"]: value,
                                }));
                              }}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        {/* Order Total Preview - Detailed Breakdown */}
                        {(orderFormData.frame_cost > 0 ||
                          orderFormData.frame_price > 0 ||
                          orderFormData.lens_cost > 0 ||
                          orderFormData.treatments_cost > 0 ||
                          orderFormData.labor_cost > 0 ||
                          farLensCost > 0 ||
                          nearLensCost > 0) && (
                          <Card className="bg-gray-50 border-2">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center">
                                <Calculator className="h-4 w-4 mr-2" />
                                Desglose de Precios
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {presbyopiaSolution === "two_separate" ? (
                                <>
                                  {/* Two separate lenses pricing breakdown */}
                                  <div className="space-y-2 pb-3 border-b">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                      Marco y Lente de Lejos:
                                    </p>
                                    <div className="flex justify-between pl-4">
                                      <span className="text-xs text-gray-600">
                                        Marco de Lejos:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(
                                          orderFormData.frame_cost > 0
                                            ? orderFormData.frame_cost
                                            : orderFormData.frame_price || 0,
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pl-4">
                                      <span className="text-xs text-gray-600">
                                        Lente de Lejos:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(farLensCost || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2 pb-3 border-b">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                      Marco y Lente de Cerca:
                                    </p>
                                    {customerOwnNearFrame ? (
                                      <div className="flex justify-between pl-4">
                                        <span className="text-xs text-gray-600">
                                          Marco de Cerca:
                                        </span>
                                        <span className="text-xs font-medium">
                                          $0 (Cliente trae marco)
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between pl-4">
                                        <span className="text-xs text-gray-600">
                                          Marco de Cerca:
                                        </span>
                                        <span className="text-xs font-medium">
                                          {formatCurrency(
                                            orderFormData.near_frame_cost > 0
                                              ? orderFormData.near_frame_cost
                                              : orderFormData.near_frame_price ||
                                                  0,
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between pl-4">
                                      <span className="text-xs text-gray-600">
                                        Lente de Cerca:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(nearLensCost || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  {orderFormData.treatments_cost > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">
                                        Tratamientos:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(
                                          orderFormData.treatments_cost,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {orderFormData.labor_cost > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">
                                        Mano de Obra:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(
                                          orderFormData.labor_cost,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Single lens pricing breakdown */}
                                  {(orderFormData.frame_cost > 0 ||
                                    orderFormData.frame_price > 0) && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">
                                        Marco:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(
                                          orderFormData.frame_cost > 0
                                            ? orderFormData.frame_cost
                                            : orderFormData.frame_price || 0,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {lensType === "contact" &&
                                    (orderFormData.contact_lens_price > 0 ||
                                      orderFormData.contact_lens_cost > 0) && (
                                      <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">
                                          Lentes de Contacto:
                                        </span>
                                        <span className="text-xs font-medium">
                                          {formatCurrency(
                                            orderFormData.contact_lens_price ||
                                              orderFormData.contact_lens_cost ||
                                              0,
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  {orderFormData.lens_cost > 0 &&
                                    lensType !== "contact" && (
                                      <div className="flex justify-between">
                                        <span className="text-xs text-gray-600">
                                          Lente:
                                        </span>
                                        <span className="text-xs font-medium">
                                          {formatCurrency(
                                            orderFormData.lens_cost,
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  {orderFormData.treatments_cost > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">
                                        Tratamientos:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(
                                          orderFormData.treatments_cost,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {orderFormData.labor_cost > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">
                                        Mano de Obra:
                                      </span>
                                      <span className="text-xs font-medium">
                                        {formatCurrency(
                                          orderFormData.labor_cost,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {(() => {
                                const framePrice =
                                  orderFormData.frame_cost > 0
                                    ? orderFormData.frame_cost
                                    : orderFormData.frame_price || 0;

                                // Include second frame price if two separate lenses
                                const nearFramePrice =
                                  presbyopiaSolution === "two_separate" &&
                                  !customerOwnNearFrame
                                    ? orderFormData.near_frame_cost > 0
                                      ? orderFormData.near_frame_cost
                                      : orderFormData.near_frame_price || 0
                                    : 0;

                                // Calculate lens cost - for two_separate, use sum of far and near lens costs
                                const effectiveLensCost =
                                  presbyopiaSolution === "two_separate"
                                    ? (farLensCost || 0) + (nearLensCost || 0)
                                    : orderFormData.lens_cost || 0;

                                const subtotal =
                                  framePrice +
                                  nearFramePrice +
                                  effectiveLensCost +
                                  orderFormData.treatments_cost +
                                  orderFormData.labor_cost;

                                // Calculate discount based on type
                                let discountAmount = 0;
                                let discountLabel = "";
                                if (discountType === "percentage") {
                                  discountAmount =
                                    subtotal *
                                    (orderFormData.discount_percentage / 100);
                                  discountLabel = `Descuento (${orderFormData.discount_percentage}%)`;
                                } else {
                                  discountAmount =
                                    orderFormData.discount_amount || 0;
                                  discountLabel = `Descuento ($${formatPrice(discountAmount)})`;
                                }

                                // Ensure discount doesn't exceed subtotal
                                if (discountAmount > subtotal) {
                                  discountAmount = subtotal;
                                }

                                const subtotalAfterDiscount =
                                  subtotal - discountAmount;

                                return (
                                  <>
                                    <div className="border-t pt-2 flex justify-between">
                                      <span className="text-sm font-semibold">
                                        Subtotal:
                                      </span>
                                      <span className="text-sm font-semibold">
                                        {formatCurrency(subtotal)}
                                      </span>
                                    </div>
                                    {discountAmount > 0 && (
                                      <>
                                        <div className="flex justify-between text-red-600">
                                          <span className="text-xs">
                                            {discountType === "percentage"
                                              ? `Descuento (${orderFormData.discount_percentage}%)`
                                              : `Descuento ($${formatPrice(orderFormData.discount_amount)})`}
                                            :
                                          </span>
                                          <span className="text-xs font-medium">
                                            -{formatCurrency(discountAmount)}
                                          </span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between">
                                          <span className="text-sm font-bold">
                                            Total:
                                          </span>
                                          <span className="text-sm font-bold text-green-600">
                                            {formatCurrency(
                                              subtotalAfterDiscount,
                                            )}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    {discountAmount === 0 && (
                                      <div className="border-t pt-2 flex justify-between">
                                        <span className="text-sm font-bold">
                                          Total:
                                        </span>
                                        <span className="text-sm font-bold text-green-600">
                                          {formatCurrency(subtotal)}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        )}

                        {/* Add to Cart Button */}
                        <Button
                          type="button"
                          onClick={handleAddCompleteOrderToCart}
                          disabled={
                            lensType === "contact"
                              ? !orderFormData.contact_lens_family_id &&
                                orderFormData.contact_lens_cost === 0 &&
                                orderFormData.contact_lens_price === 0
                              : !orderFormData.lens_family_id &&
                                orderFormData.lens_cost === 0 &&
                                farLensCost === 0 &&
                                nearLensCost === 0
                          }
                          className="w-full"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Orden al Carrito
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Cart, Payment (desktop only; mobile uses bottom drawer) */}
        <div className="hidden lg:flex w-full lg:w-1/3 flex-col bg-white border-l-0 lg:border-l overflow-hidden min-h-0 order-1 lg:order-2">
          {/* Scrollable Content - Cart, Summary & Payment */}
          <div className="flex-1 overflow-y-auto bg-[var(--admin-bg-primary)]">
            {/* Cart - extracted component */}
            <div className="p-4 border-b">
              <POSCart
                items={cart}
                subtotal={subtotal}
                taxAmount={taxAmount}
                total={total}
                onUpdateQuantity={updateCartQuantity}
                onRemove={removeFromCart}
              />
            </div>

            {/* Payment Method - totals shown in POSCart */}
            <Card className="mx-4 mb-4 flex-shrink-0 bg-[var(--admin-bg-tertiary)]">
              <CardHeader>
                <CardTitle className="text-lg">Método de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="min-h-[48px] sm:h-16"
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Efectivo
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "debit_card" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("debit_card")}
                    className="min-h-[48px] sm:h-16"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Débito
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "credit_card" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("credit_card")}
                    className="min-h-[48px] sm:h-16"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Crédito
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "transfer" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("transfer")}
                    className="min-h-[48px] sm:h-16"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Transferencia
                  </Button>
                </div>

                {paymentMethod === "cash" && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="cash-partial"
                        checked={isCashPartial}
                        onChange={(e) => {
                          setIsCashPartial(e.target.checked);
                          if (!e.target.checked) {
                            setCashPartialAmount(0);
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="cash-partial" className="cursor-pointer">
                        Pago parcial (abono)
                      </Label>
                    </div>
                    {isCashPartial ? (
                      <>
                        <Label>
                          Monto a Pagar (opcional - dejar vacío para pago
                          completo)
                        </Label>
                        <Input
                          type="number"
                          placeholder="Dejar vacío para pagar el total"
                          value={cashPartialAmount > 0 ? cashPartialAmount : ""}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setCashPartialAmount(value);
                          }}
                          className="text-lg"
                          min={0}
                          max={total}
                        />
                        {cashPartialAmount > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-sm text-gray-600">
                              Abono:{" "}
                              <span className="font-semibold">
                                {formatCurrency(cashPartialAmount)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Saldo pendiente:{" "}
                              <span className="font-semibold text-orange-600">
                                {formatCurrency(total - cashPartialAmount)}
                              </span>
                            </div>
                            {cashPartialAmount < total * 0.5 && (
                              <div className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                El abono mínimo recomendado es{" "}
                                {formatCurrency(total * 0.5)} (50%)
                              </div>
                            )}
                          </div>
                        )}
                        {cashPartialAmount === 0 && (
                          <div className="mt-2 text-sm text-gray-500">
                            Se procesará el pago completo:{" "}
                            {formatCurrency(total)}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Label>Monto Recibido</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={cashReceived || ""}
                          onChange={(e) =>
                            setCashReceived(parseFloat(e.target.value) || 0)
                          }
                          className="text-lg"
                        />
                        {cashReceived > 0 && change >= 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            Vuelto:{" "}
                            <span className="font-semibold">
                              {formatCurrency(change)}
                            </span>
                          </div>
                        )}
                        {cashReceived > 0 && change < 0 && (
                          <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Faltan {formatCurrency(Math.abs(change))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {(paymentMethod === "transfer" ||
                  paymentMethod === "debit_card" ||
                  paymentMethod === "credit_card") && (
                  <div>
                    <Label>
                      {paymentMethod === "transfer"
                        ? "Monto de Transferencia"
                        : "Monto a Pagar (opcional - dejar vacío para pago completo)"}
                    </Label>
                    <Input
                      type="number"
                      placeholder={
                        paymentMethod === "transfer"
                          ? "Ingrese el monto de transferencia"
                          : "Dejar vacío para pagar el total"
                      }
                      value={depositAmount > 0 ? depositAmount : ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setDepositAmount(value);
                      }}
                      className="text-lg"
                      min={0}
                      max={total}
                    />
                    {depositAmount > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-gray-600">
                          {paymentMethod === "transfer"
                            ? "Transferencia"
                            : "Abono"}
                          :{" "}
                          <span className="font-semibold">
                            {formatCurrency(depositAmount)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Saldo pendiente:{" "}
                          <span className="font-semibold text-orange-600">
                            {formatCurrency(total - depositAmount)}
                          </span>
                        </div>
                        {depositAmount < total * 0.5 && (
                          <div className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            El abono mínimo recomendado es{" "}
                            {formatCurrency(total * 0.5)} (50%)
                          </div>
                        )}
                      </div>
                    )}
                    {depositAmount === 0 && paymentMethod !== "transfer" && (
                      <div className="mt-2 text-sm text-gray-500">
                        Se procesará el pago completo: {formatCurrency(total)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fixed Process Payment Button */}
          <div className="p-4 border-t flex-shrink-0 space-y-3 bg-[var(--admin-bg-primary)]">
            {/* Warning if cash closed */}
            {isCashOpen === false && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    Caja cerrada
                  </p>
                  <p className="text-xs text-red-700">
                    No se pueden realizar ventas sin abrir la caja. Ve a Caja
                    para abrirla.
                  </p>
                </div>
              </div>
            )}
            <Button
              onClick={() => setShowPaymentDialog(true)}
              disabled={
                cart.length === 0 || processingPayment || isCashOpen === false
              }
              className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Finalizar Pago
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Caja cerrada alert - blocks Cobrar when shown */}
      {!isSuperAdmin && currentBranchId && isCashOpen === false && (
        <div className="lg:hidden fixed bottom-28 left-0 right-0 z-50 px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Caja cerrada</p>
              <p className="text-xs text-red-700">
                Debe abrir la caja antes de realizar ventas.
              </p>
              <Link href="/admin/cash-register" className="mt-2 inline-block">
                <Button size="sm" variant="default">
                  Abrir Caja
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Sticky bottom cart bar - tap to open payment drawer */}
      <button
        type="button"
        onClick={() => {
          if (processingPayment) return;
          if (!isSuperAdmin && !currentBranchId) return;
          if (isCashOpen === false) {
            toast.error(
              "La caja está cerrada. Debe abrir la caja antes de realizar ventas.",
            );
            return;
          }
          if (cart.length === 0) {
            toast.info("Agrega productos al carrito para cobrar");
            return;
          }
          setMobilePaymentDrawerOpen(true);
        }}
        className={`lg:hidden fixed bottom-16 left-0 right-0 z-50 bg-[var(--admin-bg-tertiary)] border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] w-full text-left ${
          cart.length === 0 ||
          processingPayment ||
          isCashOpen === false ||
          (!isSuperAdmin && !currentBranchId)
            ? "opacity-70 cursor-not-allowed"
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-admin-text-tertiary shrink-0" />
              <span className="text-sm font-medium text-admin-text-primary">
                {cart.length} {cart.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="text-lg font-bold text-epoch-primary truncate">
              {formatCurrency(total)}
            </div>
          </div>
          <div className="shrink-0 min-h-[44px] px-6 flex items-center justify-center rounded-lg bg-green-600 text-white font-semibold">
            {processingPayment ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Cobrar
              </>
            )}
          </div>
        </div>
      </button>

      {/* Mobile: Payment drawer - opens upward with cart, payment methods, partial input */}
      <Sheet
        open={mobilePaymentDrawerOpen}
        onOpenChange={setMobilePaymentDrawerOpen}
      >
        <SheetContent
          side="bottom"
          hideDefaultClose
          className="h-[85vh] max-h-[85vh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cobrar</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobilePaymentDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="border rounded-lg p-3">
              <POSCart
                items={cart}
                subtotal={subtotal}
                taxAmount={taxAmount}
                total={total}
                onUpdateQuantity={updateCartQuantity}
                onRemove={removeFromCart}
              />
            </div>
            <Card className="bg-[var(--admin-bg-tertiary)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Método de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="min-h-[44px]"
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Efectivo
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "debit_card" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("debit_card")}
                    className="min-h-[44px]"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Débito
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "credit_card" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("credit_card")}
                    className="min-h-[44px]"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Crédito
                  </Button>
                  <Button
                    variant={
                      paymentMethod === "transfer" ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod("transfer")}
                    className="min-h-[44px]"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Transferencia
                  </Button>
                </div>
                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="mobile-cash-partial"
                        checked={isCashPartial}
                        onChange={(e) => {
                          setIsCashPartial(e.target.checked);
                          if (!e.target.checked) setCashPartialAmount(0);
                        }}
                        className="rounded"
                      />
                      <Label
                        htmlFor="mobile-cash-partial"
                        className="cursor-pointer text-sm"
                      >
                        Pago parcial (abono)
                      </Label>
                    </div>
                    {isCashPartial ? (
                      <>
                        <Input
                          type="number"
                          placeholder="Monto o vacío para total"
                          value={cashPartialAmount > 0 ? cashPartialAmount : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setCashPartialAmount(v);
                          }}
                          className="text-base"
                          min={0}
                          max={total}
                        />
                        {cashPartialAmount > 0 && (
                          <p className="text-xs text-gray-600">
                            Saldo: {formatCurrency(total - cashPartialAmount)}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <Label className="text-sm">Monto Recibido</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={cashReceived || ""}
                          onChange={(e) =>
                            setCashReceived(parseFloat(e.target.value) || 0)
                          }
                          className="text-base"
                        />
                        {cashReceived > 0 && change >= 0 && (
                          <p className="text-sm text-gray-600">
                            Vuelto: {formatCurrency(change)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {(paymentMethod === "transfer" ||
                  paymentMethod === "debit_card" ||
                  paymentMethod === "credit_card") && (
                  <div>
                    <Label className="text-sm">
                      {paymentMethod === "transfer"
                        ? "Monto Transferencia"
                        : "Abono (opcional)"}
                    </Label>
                    <Input
                      type="number"
                      placeholder={
                        paymentMethod === "transfer" ? "Monto" : "Vacío = total"
                      }
                      value={depositAmount > 0 ? depositAmount : ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setDepositAmount(v);
                      }}
                      className="text-base mt-1"
                      min={0}
                      max={total}
                    />
                    {depositAmount > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Saldo: {formatCurrency(total - depositAmount)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="p-4 border-t flex-shrink-0">
            <Button
              onClick={() => {
                setShowPaymentDialog(true);
                setMobilePaymentDrawerOpen(false);
              }}
              disabled={
                cart.length === 0 || processingPayment || isCashOpen === false
              }
              className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {processingPayment ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Cobrar {formatCurrency(total)}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Confirmation Dialog */}
      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setFiscalReference("");
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl border-admin-border-primary">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Venta</DialogTitle>
            <DialogDescription className="text-admin-text-secondary">
              Revisa los detalles antes de procesar el pago
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-admin-text-secondary mb-2">
                Total a pagar:
              </div>
              <div className="text-2xl font-bold text-admin-success">
                {formatCurrency(total)}
              </div>
            </div>
            <div>
              <div className="text-sm text-admin-text-secondary mb-1">
                Método de pago:
              </div>
              <div className="font-medium text-admin-text-primary">
                {paymentMethod === "cash" && "Efectivo"}
                {paymentMethod === "debit_card" && "Tarjeta Débito"}
                {paymentMethod === "credit_card" && "Tarjeta Crédito"}
                {paymentMethod === "transfer" && "Transferencia"}
              </div>
            </div>
            {(paymentMethod === "transfer" ||
              paymentMethod === "debit_card" ||
              paymentMethod === "credit_card") &&
              depositAmount > 0 && (
                <div>
                  <div className="text-sm text-admin-text-secondary mb-1">
                    Monto de abono:
                  </div>
                  <div className="font-medium text-admin-info">
                    {formatCurrency(depositAmount)}
                  </div>
                  {depositAmount < total && (
                    <div className="text-xs text-admin-text-tertiary mt-1">
                      Saldo pendiente: {formatCurrency(total - depositAmount)}
                    </div>
                  )}
                </div>
              )}
            {(paymentMethod === "debit_card" ||
              paymentMethod === "credit_card" ||
              paymentMethod === "transfer") && (
              <div>
                <Label className="text-sm text-admin-text-secondary">
                  Número de referencia fiscal (opcional)
                </Label>
                <Input
                  placeholder="Ej: Nº boleta, factura o transacción"
                  value={fiscalReference}
                  onChange={(e) => setFiscalReference(e.target.value)}
                  className="mt-1 rounded-xl"
                />
                <p className="text-xs text-admin-warning mt-1">
                  Se recomienda registrar el número para trazabilidad con
                  documentos fiscales reales
                </p>
                {!fiscalReference && (
                  <p className="text-xs text-admin-text-tertiary mt-0.5">
                    Puede continuar sin ingresar (opcional)
                  </p>
                )}
              </div>
            )}
            {paymentMethod === "cash" && cashReceived > 0 && (
              <div>
                <div className="text-sm text-admin-text-secondary mb-1">
                  Vuelto:
                </div>
                <div className="font-medium text-admin-text-primary">
                  {formatCurrency(change)}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={processPayment}
                disabled={processingPayment}
                className="flex-1 rounded-xl"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Selection Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Presupuestos del Cliente</DialogTitle>
            <DialogDescription>
              Este cliente tiene {customerQuotes.length} presupuesto(s)
              disponible(s). ¿Deseas cargar alguno?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingQuotes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : customerQuotes.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {customerQuotes.map((quote) => (
                  <Card
                    key={quote.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleLoadQuote(quote)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            Presupuesto {quote.quote_number}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {quote.frame_name && (
                              <span>Marco: {quote.frame_name}</span>
                            )}
                            {quote.lens_type && (
                              <span className="ml-2">
                                Lente: {quote.lens_type}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Creado: {formatDate(quote.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(quote.total_amount)}
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {quote.status}
                          </Badge>
                        </div>
                        <FileText className="h-5 w-5 ml-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No hay presupuestos disponibles</p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowQuoteDialog(false)}
                className="flex-1"
              >
                Continuar sin Cargar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Balance Payment Dialog */}
      <POSPendingBalanceDialog
        open={showPendingBalanceDialog}
        onOpenChange={(o) => {
          setShowPendingBalanceDialog(o);
          if (!o) {
            setPendingBalanceSearchTerm("");
            setSelectedPendingOrder(null);
            setPendingFiscalReference("");
          }
        }}
        orders={pendingBalanceOrders}
        allOrders={allPendingBalanceOrders}
        loading={loadingPendingBalance}
        selectedOrder={selectedPendingOrder}
        pendingPaymentAmount={pendingPaymentAmount}
        pendingPaymentMethod={pendingPaymentMethod}
        pendingFiscalReference={pendingFiscalReference}
        processingPayment={processingPendingPayment}
        searchTerm={pendingBalanceSearchTerm}
        onFetchOrders={fetchPendingBalanceOrders}
        onFilterSearch={(value) => {
          setPendingBalanceSearchTerm(value);
          filterPendingBalanceBySearch(value, allPendingBalanceOrders);
        }}
        onSelectOrder={(order) => {
          setSelectedPendingOrder(order);
          setPendingPaymentAmount(order?.pending_amount?.toString() ?? "");
        }}
        onPaymentAmountChange={setPendingPaymentAmount}
        onPaymentMethodChange={setPendingPaymentMethod}
        onFiscalReferenceChange={setPendingFiscalReference}
        onProcessPayment={processPendingPayment}
        onRefundClick={(order) => {
          setRefundOrderId(order.id);
          setRefundOrderNumber(order.order_number || "");
          setShowRefundDialog(true);
        }}
      />

      {/* Refund Dialog */}
      <POSRefundDialog
        open={showRefundDialog}
        onOpenChange={(open) => {
          setShowRefundDialog(open);
          if (!open) {
            setRefundOrderId(null);
            setRefundOrderNumber("");
          }
        }}
        orderId={refundOrderId || ""}
        orderNumber={refundOrderNumber}
        branchId={currentBranchId}
        onSuccess={fetchPendingBalanceOrders}
      />

      {/* Receipt for printing - rendered in portal as direct body child so @media print only shows it */}
      {typeof document !== "undefined" &&
        lastProcessedOrder &&
        createPortal(
          <div
            id="print-receipt-portal"
            className="hidden print:block"
            aria-hidden="true"
          >
            <POSReceipt
              ref={printRef}
              order={lastProcessedOrder}
              settings={billingSettings}
              branch={
                branches.find(
                  (b) =>
                    b.id === (currentBranchId || lastProcessedOrder?.branch_id),
                ) ?? null
              }
              organization={organization}
              receiptType={receiptType}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
