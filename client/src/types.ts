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
