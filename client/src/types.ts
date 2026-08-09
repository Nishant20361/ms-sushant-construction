// Shared client-side types (mirror server serializers)

export interface Category {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  mrp: number;
  stock: number;
  isActive: boolean;
  categoryId: number;
  category: { id: number; name: string; slug: string } | null;
  imageUrl: string | null;
  images: ProductImage[];
}

export interface SiteSettings {
  companyName: string;
  tagline: string;
  logoUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  heroBannerUrl: string | null;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  aboutContent: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  // Business invoice fields
  businessName: string;
  businessAddress: string;
  gstNumber: string;
  businessMobile: string;
  businessEmail: string;
  businessLogoUrl: string;
}

export interface CartItem {
  productId: number;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  imageUrl: string | null;
  quantity: number;
  maxStock: number;
}

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMode = "CASH" | "ONLINE";
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "DUE";

export interface OrderPayment {
  id: number;
  orderId: number;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress: string | null;
  notes: string | null;
  subtotal: number;
  finalAmount: number;
  status: OrderStatus;
  items: {
    id: number;
    productId: number;
    productName: string;
    unit: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  payments: OrderPayment[];
  cashTotal: number;
  onlineTotal: number;
  paidTotal: number;
  due: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DueOrderEntry {
  id: number;
  orderNumber: string;
  finalAmount: number;
  paid: number;
  due: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface CustomerDue {
  customerName: string;
  customerMobile: string;
  totalOrders: number;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
  orders: DueOrderEntry[];
}

export interface CustomerOrderDetail {
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

export interface PaymentHistoryEntry {
  id: number;
  orderNumber: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  notes: string | null;
  previousDue: number;
  remainingDue: number;
}

export interface CustomerDetail {
  customer: {
    customerName: string;
    customerMobile: string;
    totalOrders: number;
    totalPurchase: number;
    totalPaid: number;
    totalDue: number;
  };
  orders: CustomerOrderDetail[];
  paymentHistory: PaymentHistoryEntry[];
}

export interface DashboardStats {
  stats: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    processingOrders: number;
    outForDeliveryOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
totalRevenue: number;
    totalCollected: number;
    totalCashCollected: number;
    totalOnlineCollected: number;
    totalDue: number;
    lowStockCount: number;
    lowStockThreshold: number;
  };
  recentOrders: Order[];
  lowStockProducts: Product[];
}

export interface Notification {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  read: boolean;
  createdAt: string;
}

export interface AdminProfile {
  lowStockThreshold: number;
  email: string | null;
  username: string;
}

export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  subtotal: number;
  customerName: string;
  deliveryAddress: string | null;
  items: {
    productName: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }[];
  bill: TrackedBill | null;
}

export interface TrackedOrderSummary {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  subtotal: number;
  customerName: string;
  items: {
    productName: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }[];
  bill: TrackedBill | null;
}

export interface TrackedBill {
  discount: number;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
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

export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
}

// ------------------------- Construction Assistant ---------------------
export type AssistantLanguage = "Hindi" | "English";

export interface AssistantConversation {
  length: number | null;
  width: number | null;
  area: number | null;
  floors: number | null;
  totalArea: number | null;
  quality: string | null;
  location: string | null;
}

export interface ConstructionChatResponse {
  reply: string;
  language: AssistantLanguage;
  sessionId: string;
  conversation?: AssistantConversation;
  suggestions?: string[];
  producedEstimate?: boolean;
}

// ------------------------- Sales Reports ------------------------
export type ReportType = "daily" | "weekly" | "monthly";

export interface ReportLineItem {
  productId: number;
  productName: string;
  category: string | null;
  imageUrl: string | null;
  unit: string;
  price: number;
  quantity: number;
  total: number;
}

export interface ReportOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress: string | null;
  createdAt: string;
  status: string;
  subtotal: number;
  discount: number;
  finalAmount: number;
  cashPaid: number;
  onlinePaid: number;
  duePaid: number;
  remainingDue: number;
  paymentStatus: string;
  items: ReportLineItem[];
}

export interface SalesReport {
  reportType: ReportType;
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalSales: number;
    totalDiscount: number;
    cashCollection: number;
    onlineCollection: number;
    dueCollection: number;
    remainingDue: number;
    uniqueCustomers: number;
    productsSold: number;
    totalQuantitySold: number;
  };
  orders: ReportOrder[];
}

export interface ReportFilters {
  customerName?: string;
  phone?: string;
  orderId?: string;
  paymentType?: string;
  status?: string;
  productName?: string;
  category?: string;
}

// ------------------------- Phase 2 Analytics ------------------------
export interface SalesAnalytics {
  todaySales: number;
  yesterdaySales: number;
  thisWeekSales: number;
  lastWeekSales: number;
  thisMonthSales: number;
  lastMonthSales: number;
  thisYearSales: number;
  totalLifetimeSales: number;
}

export interface PaymentAnalytics {
  cashCollection: number;
  onlineCollection: number;
  totalCollected: number;
  dueOutstanding: number;
  recoveredDue: number;
  pendingDue: number;
}

export interface TopCustomer {
  customerName: string;
  customerMobile: string;
  customerSince: string;
  lastPurchase: string;
  totalOrders: number;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
  averageOrderValue: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  unit: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
  customerCount: number;
  lastSold: string;
  averagePrice: number;
}

export interface CategoryReportRow {
  category: string;
  orders: number;
  quantity: number;
  revenue: number;
}

export interface PaymentModeRow {
  mode: string;
  orders: number;
  revenue: number;
  percentage: number;
}

export interface ChartPoint {
  date?: string;
  week?: string;
  month?: string;
  name?: string;
  sales?: number;
  value?: number;
  due?: number;
}

export interface CustomerDueReportRow {
  customerName: string;
  customerMobile: string;
  address: string | null;
  totalOrders: number;
  totalPurchase: number;
  totalPaid: number;
  remainingDue: number;
  lastPaymentDate: string | null;
  oldestDueDate: string | null;
  newestDueDate: string | null;
}

export interface CustomerDueReport {
  customers: CustomerDueReportRow[];
  total: number;
  page: number;
  pages: number;
  summary: {
    totalCustomers: number;
    totalPendingDue: number;
  };
}

export interface CustomerStatement {
  customer: {
    customerName: string;
    customerMobile: string;
    address: string | null;
    customerSince: string;
    totalOrders: number;
    totalPurchase: number;
    totalPaid: number;
    totalDue: number;
  };
  ledger: {
    type: "ORDER" | "PAYMENT";
    orderNumber: string;
    date: string;
    debit: number;
    credit: number;
    mode?: string;
    notes?: string | null;
    balance: number;
  }[];
  orders: {
    id: number;
    orderNumber: string;
    createdAt: string;
    finalAmount: number;
    paid: number;
    due: number;
    items: {
      productId: number;
      productName: string;
      quantity: number;
      unit: string;
      price: number;
      total: number;
    }[];
  }[];
}

export interface ProductHistory {
  product: {
    id: number;
    name: string;
    unit: string;
    price: number;
    stock: number;
    category: string | null;
  };
  stats: {
    totalQuantitySold: number;
    revenue: number;
    customersPurchased: number;
    lastSold: string | null;
    averageSellingPrice: number;
    averageRate: number;
  };
  recentOrders: {
    orderId: number;
    orderNumber: string;
    customerName: string;
    customerMobile: string;
    quantity: number;
    total: number;
    status: string;
    createdAt: string;
  }[];
}
