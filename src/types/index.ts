export type ProductType =
  | "FELT"
  | "CLOTH"
  | "CHRISTMAS"
  | "SCHOOL"
  | "DECORATION"
  | "KEEPSAKE"
  | "COSTUME"
  | "EASTER"
  | "PUPPETS"
  | "MISC"
  | "REPAIR"
  | "QUIET_BOOK"
  | "TOYS"
  | "STATIONERY";

export type OrderStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "PAID"
  | "CANCELED";

export type SortOrder = "asc" | "desc";

export interface Customer {
  id: number;
  number: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: string;
  total_units: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithOrders extends Customer {
  orders: OrderSummary[];
}

export interface Product {
  id: number;
  number: number;
  name: string;
  description: string | null;
  product_type: ProductType;
  price: string;
  stock_quantity: number;
  units_sold: number;
  revenue: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string | null;
  product_number: number | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface OrderStatusHistory {
  id: number;
  status: OrderStatus;
  changed_at: string;
}

export interface OrderSummary {
  id: number;
  number: number;
  customer_id: number;
  status: OrderStatus;
  total: string;
  created_at: string;
}

export interface Order extends OrderSummary {
  items: OrderItem[];
  status_history: OrderStatusHistory[];
  updated_at: string;
}

export interface MonthlyRevenue {
  year: number;
  month: number;
  value: string;
}

export interface ChartPoint {
  date: string;
  value: string;
}

export interface ProductSalesPoint {
  date: string;
  quantity: number;
}

export interface TopProduct {
  product_id: number;
  product_number: number;
  product_name: string;
  units_sold: number;
  revenue: string;
}

export interface ProductRevenueShare {
  product_id: number;
  product_number: number;
  product_name: string;
  revenue: string;
  percentage: string;
}

export interface RevenueChartPoint {
  period: string;
  value: string;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  FELT: "Feltro",
  CLOTH: "Tecido",
  CHRISTMAS: "Natal",
  SCHOOL: "Escolar",
  DECORATION: "Decoração",
  KEEPSAKE: "Lembrança",
  COSTUME: "Fantasia",
  EASTER: "Páscoa",
  PUPPETS: "Fantoches",
  MISC: "Diversos",
  REPAIR: "Reparo",
  QUIET_BOOK: "Quiet Book",
  TOYS: "Brinquedos",
  STATIONERY: "Papelaria",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  READY: "Pronto",
  DELIVERED: "Entregue",
  PAID: "Pago",
  CANCELED: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-gray-200 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  READY: "bg-brand-yellow text-yellow-900",
  DELIVERED: "bg-purple-100 text-purple-800",
  PAID: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-800",
};
