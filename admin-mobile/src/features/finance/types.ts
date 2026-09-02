export type PaymentMode = "CASH" | "ONLINE";
export type PaymentStatus = "DUE" | "PARTIALLY_PAID" | "PAID" | "UNKNOWN";

export interface DueOrder {
  id: number;
  orderNumber: string;
  createdAt: string;
  finalAmount: number;
  cashPaid: number;
  onlinePaid: number;
  paid: number;
  due: number;
  paymentStatus: PaymentStatus;
}

export interface DueCustomer {
  customerName: string;
  customerMobile: string;
  totalOrders: number;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
  orders: DueOrder[];
}

export interface PaymentHistory {
  id: number;
  orderNumber: string;
  amount: number;
  paymentMode: PaymentMode | "UNKNOWN";
  paymentDate: string;
  notes: string | null;
  previousDue: number;
  remainingDue: number;
}

export interface CustomerDetail {
  customer: Omit<DueCustomer, "orders">;
  orders: DueOrder[];
  paymentHistory: PaymentHistory[];
}

export interface DueFilters {
  search: string;
  dateRange: "" | "today" | "week" | "month";
  paymentStatus: "" | "DUE" | "PARTIALLY_PAID" | "PAID";
  from: string;
  to: string;
}

export interface Bill {
  id: number;
  orderId: number;
  subtotal: number;
  discount: number;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPayload {
  amount: number;
  paymentMode: PaymentMode;
  paymentDate?: string;
  notes?: string;
}

export interface KhatabookAuthStatus {
  isPinSet: boolean;
  maskedEmail: string;
  defaultPinActive: boolean;
  recoveryEmail?: string;
}

export interface ChangePinPayload {
  currentPin?: string;
  adminPassword?: string;
  newPin?: string;
  recoveryEmail?: string;
}

export interface ResetPinPayload {
  otp: string;
  newPin: string;
}

export interface ProductPurchaseBatch {
  id: number;
  batchNumber: string;
  productId: number;
  productName?: string;
  unit?: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  note: string | null;
  initialQuantity: number;
  remainingQuantity: number;
  costPricePerUnit: number;
  totalPurchaseCost: number;
  purchaseDate: string;
  createdAt: string;
}

export interface ProductProfitItem {
  productId: number;
  productName: string;
  categoryName: string;
  unit: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  discountGiven: number;
  netProfit: number;
  marginPercent: number;
  uncostedRevenue: number;
}

export interface ProfitAnalyticsData {
  dailyProfit: {
    grossProfit: number;
    discountGiven: number;
    netProfit: number;
    ordersCount: number;
  };
  monthlyProfit: {
    grossProfit: number;
    discountGiven: number;
    netProfit: number;
    ordersCount: number;
  };
  allTimeProfit: {
    grossProfit: number;
    discountGiven: number;
    netProfit: number;
    ordersCount: number;
  };
  customRange: {
    from: string;
    to: string;
    grossProfit: number;
    discountGiven: number;
    netProfit: number;
    totalRevenue: number;
    totalCost: number;
    ordersCount: number;
    productProfits: ProductProfitItem[];
  } | null;
  allProductProfits: ProductProfitItem[];
  currentStockValuation: number;
  activeBatchesCount: number;
  costingCoverage: { uncostedRevenue: number; uncostedUnits: number; isComplete: boolean };
  productProfits: ProductProfitItem[];
  recentBatches: ProductPurchaseBatch[];
}
