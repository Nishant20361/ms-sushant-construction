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
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  deliveryAddress: string;
  notes: string | null;
  subtotal: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  stats: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    lowStockCount: number;
  };
  recentOrders: Order[];
  lowStockProducts: Product[];
}

export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
}

