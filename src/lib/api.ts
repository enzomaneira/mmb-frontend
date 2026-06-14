import type {
  ChartPoint,
  Customer,
  CustomerWithOrders,
  MonthlyRevenue,
  Order,
  OrderStatus,
  Product,
  ProductRevenueShare,
  ProductSalesPoint,
  ProductType,
  RevenueChartPoint,
  SortOrder,
  TopProduct,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail = "Erro na requisição";
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
      if (Array.isArray(detail)) {
        detail = detail.map((d) => d.msg ?? d).join(", ");
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(String(detail), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  customers: {
    list: (params?: {
      search?: string;
      sort_by?: string;
      sort_order?: SortOrder;
    }) => request<Customer[]>(`/customers${buildQuery(params ?? {})}`),

    get: (id: number) => request<CustomerWithOrders>(`/customers/${id}`),

    getByNumber: (number: number) =>
      request<CustomerWithOrders>(`/customers/by-number/${number}`),

    create: (data: {
      number: number;
      name: string;
      email?: string;
      phone?: string;
      notes?: string;
    }) =>
      request<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: number,
      data: Partial<{
        number: number;
        name: string;
        email: string;
        phone: string;
        notes: string;
      }>,
    ) =>
      request<Customer>(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      request<void>(`/customers/${id}`, { method: "DELETE" }),
  },

  products: {
    list: (params?: {
      search?: string;
      product_type?: ProductType;
      min_price?: number;
      max_price?: number;
      min_units_sold?: number;
      max_units_sold?: number;
      sort_by?: string;
      sort_order?: SortOrder;
    }) => request<Product[]>(`/products${buildQuery(params ?? {})}`),

    get: (id: number) => request<Product>(`/products/${id}`),

    getByNumber: (number: number) =>
      request<Product>(`/products/by-number/${number}`),

    create: (data: {
      number: number;
      name: string;
      description?: string;
      product_type: ProductType;
      price: number;
      stock_quantity?: number;
    }) =>
      request<Product>("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: number,
      data: Partial<{
        number: number;
        name: string;
        description: string;
        product_type: ProductType;
        price: number;
        stock_quantity: number;
      }>,
    ) =>
      request<Product>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    updateStock: (id: number, stock_quantity: number) =>
      request<Product>(`/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stock_quantity }),
      }),

    delete: (id: number) =>
      request<void>(`/products/${id}`, { method: "DELETE" }),
  },

  orders: {
    list: (params?: {
      customer_id?: number;
      min_total?: number;
      max_total?: number;
      start_date?: string;
      end_date?: string;
      sort_by?: string;
      sort_order?: SortOrder;
    }) => request<Order[]>(`/orders${buildQuery(params ?? {})}`),

    get: (id: number) => request<Order>(`/orders/${id}`),

    create: (data: {
      number: number;
      customer_id: number;
      status?: OrderStatus;
      items: { product_id: number; quantity: number }[];
    }) =>
      request<Order>("/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateStatus: (id: number, status: OrderStatus) =>
      request<Order>(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    delete: (id: number) =>
      request<void>(`/orders/${id}`, { method: "DELETE" }),
  },

  revenue: {
    list: (params?: {
      start_year?: number;
      start_month?: number;
      end_year?: number;
      end_month?: number;
    }) => request<MonthlyRevenue[]>(`/revenue${buildQuery(params ?? {})}`),

    chart: (params?: {
      start_year?: number;
      start_month?: number;
      end_year?: number;
      end_month?: number;
    }) =>
      request<RevenueChartPoint[]>(`/revenue/chart${buildQuery(params ?? {})}`),
  },

  charts: {
    salesByProduct: (params: {
      product_id: number;
      start_date?: string;
      end_date?: string;
    }) =>
      request<ProductSalesPoint[]>(
        `/charts/sales-by-product${buildQuery(params)}`,
      ),

    salesByCustomer: (params: {
      customer_id: number;
      start_date?: string;
      end_date?: string;
    }) =>
      request<ChartPoint[]>(`/charts/sales-by-customer${buildQuery(params)}`),

    topProducts: (limit = 10) =>
      request<TopProduct[]>(`/charts/top-products?limit=${limit}`),

    totalSales: (params?: {
      granularity?: "day" | "month" | "year";
      start_date?: string;
      end_date?: string;
    }) =>
      request<ChartPoint[]>(`/charts/total-sales${buildQuery(params ?? {})}`),

    productRevenueShare: () =>
      request<ProductRevenueShare[]>("/charts/product-revenue-share"),
  },
};

export { ApiError };