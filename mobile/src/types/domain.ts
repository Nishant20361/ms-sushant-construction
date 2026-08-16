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
  businessName: string;
  businessAddress: string;
  gstNumber: string;
  businessMobile: string;
  businessEmail: string;
  businessLogoUrl: string;
  latestUpdateEnabled: boolean;
  latestUpdateText: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage { id: number; url: string; alt: string | null; isPrimary: boolean }

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
  category: Pick<Category, "id" | "name" | "slug"> | null;
  imageUrl: string | null;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: number;
  name: string;
  unit: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  maxStock: number;
}

export interface TrackedOrderItem { productName: string; quantity: number; unit: string; price: number; total: number }
export interface TrackedBill { discount: number; finalAmount: number; createdAt: string; updatedAt: string }
export interface TrackedOrder {
  orderNumber: string;
  status: string;
  createdAt: string;
  subtotal: number;
  customerName: string;
  items: TrackedOrderItem[];
  bill: TrackedBill | null;
}

export interface TrackedOrderSummary {
  orderNumber: string;
  status: string;
  createdAt: string;
  total: number;
  items: Array<Pick<TrackedOrderItem, "productName" | "quantity" | "unit">>;
}
