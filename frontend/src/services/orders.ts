/**
 * Orders API service
 */

import { apiService, ApiResponse, PaginatedResponse } from './api';

export interface Order {
  id: number;
  buyer_id: number;
  buyer_name?: string;
  buyer_email?: string;
  product_id: number;
  product_name?: string;
  product_image?: string;
  seller_id: number;
  seller_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'solana' | 'credit_card' | 'paypal' | 'crypto';
  transaction_hash?: string;
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  cancelled_at?: string;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface OrderCreateRequest {
  product_id: number;
  quantity: number;
  payment_method: 'solana' | 'credit_card' | 'paypal' | 'crypto';
  shipping_address?: ShippingAddress;
  notes?: string;
}

export interface OrderUpdateRequest {
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  tracking_number?: string;
  notes?: string;
}

export interface OrderFilters {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  buyer_id?: number;
  seller_id?: number;
  product_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'total_price' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_order_value: number;
  orders_this_month: number;
  revenue_this_month: number;
}

export class OrderService {
  /**
   * Get all orders with pagination and filters
   */
  async getOrders(
    page: number = 1,
    limit: number = 10,
    filters?: OrderFilters
  ): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return apiService.getPaginated<Order>('/orders', page, limit, filters);
  }

  /**
   * Get order by ID
   */
  async getOrder(id: number): Promise<ApiResponse<Order>> {
    return apiService.get<Order>(`/orders/${id}`);
  }

  /**
   * Create new order
   */
  async createOrder(orderData: OrderCreateRequest): Promise<ApiResponse<Order>> {
    return apiService.post<Order>('/orders', orderData);
  }

  /**
   * Update order
   */
  async updateOrder(id: number, orderData: OrderUpdateRequest): Promise<ApiResponse<Order>> {
    return apiService.put<Order>(`/orders/${id}`, orderData);
  }

  /**
   * Cancel order
   */
  async cancelOrder(id: number, reason?: string): Promise<ApiResponse<Order>> {
    return apiService.post<Order>(`/orders/${id}/cancel`, { reason });
  }

  /**
   * Get user's orders
   */
  async getMyOrders(
    page: number = 1,
    limit: number = 10,
    filters?: Omit<OrderFilters, 'buyer_id'>
  ): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return apiService.getPaginated<Order>('/orders/my', page, limit, filters);
  }

  /**
   * Get seller's orders
   */
  async getSellerOrders(
    page: number = 1,
    limit: number = 10,
    filters?: Omit<OrderFilters, 'seller_id'>
  ): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return apiService.getPaginated<Order>('/orders/seller', page, limit, filters);
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(
    status: string,
    page: number = 1,
    limit: number = 10,
    filters?: Omit<OrderFilters, 'status'>
  ): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return this.getOrders(page, limit, { ...filters, status });
  }

  /**
   * Get order statistics
   */
  async getOrderStats(): Promise<ApiResponse<OrderStats>> {
    return apiService.get<OrderStats>('/orders/stats');
  }

  /**
   * Get seller order statistics
   */
  async getSellerOrderStats(): Promise<ApiResponse<OrderStats>> {
    return apiService.get<OrderStats>('/orders/seller/stats');
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: number,
    status: Order['status'],
    notes?: string
  ): Promise<ApiResponse<Order>> {
    return apiService.put<Order>(`/orders/${id}/status`, { status, notes });
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: number,
    payment_status: Order['payment_status'],
    transaction_hash?: string
  ): Promise<ApiResponse<Order>> {
    return apiService.put<Order>(`/orders/${id}/payment-status`, {
      payment_status,
      transaction_hash,
    });
  }

  /**
   * Add tracking number
   */
  async addTrackingNumber(
    id: number,
    tracking_number: string,
    carrier?: string
  ): Promise<ApiResponse<Order>> {
    return apiService.put<Order>(`/orders/${id}/tracking`, {
      tracking_number,
      carrier,
    });
  }

  /**
   * Mark order as delivered
   */
  async markAsDelivered(id: number): Promise<ApiResponse<Order>> {
    return apiService.post<Order>(`/orders/${id}/deliver`);
  }

  /**
   * Request refund
   */
  async requestRefund(id: number, reason: string): Promise<ApiResponse<Order>> {
    return apiService.post<Order>(`/orders/${id}/refund-request`, { reason });
  }

  /**
   * Process refund
   */
  async processRefund(id: number, amount?: number): Promise<ApiResponse<Order>> {
    return apiService.post<Order>(`/orders/${id}/refund`, { amount });
  }

  /**
   * Get order timeline
   */
  async getOrderTimeline(id: number): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    notes?: string;
    user?: string;
  }[]>> {
    return apiService.get<{
      status: string;
      timestamp: string;
      notes?: string;
      user?: string;
    }[]>(`/orders/${id}/timeline`);
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(
    date_from?: string,
    date_to?: string
  ): Promise<ApiResponse<{
    orders_by_status: Record<string, number>;
    orders_by_month: Record<string, number>;
    revenue_by_month: Record<string, number>;
    top_products: Array<{
      product_id: number;
      product_name: string;
      orders_count: number;
      revenue: number;
    }>;
  }>> {
    const params: Record<string, any> = {};
    if (date_from) params.date_from = date_from;
    if (date_to) params.date_to = date_to;

    return apiService.get<{
      orders_by_status: Record<string, number>;
      orders_by_month: Record<string, number>;
      revenue_by_month: Record<string, number>;
      top_products: Array<{
        product_id: number;
        product_name: string;
        orders_count: number;
        revenue: number;
      }>;
    }>('/orders/analytics', { params });
  }

  /**
   * Export orders to CSV
   */
  async exportOrders(filters?: OrderFilters): Promise<ApiResponse<{ download_url: string }>> {
    return apiService.post<{ download_url: string }>('/orders/export', filters);
  }

  /**
   * Get order notifications
   */
  async getOrderNotifications(): Promise<ApiResponse<{
    id: number;
    order_id: number;
    type: 'status_update' | 'payment_received' | 'cancellation' | 'refund';
    message: string;
    read: boolean;
    created_at: string;
  }[]>> {
    return apiService.get<{
      id: number;
      order_id: number;
      type: 'status_update' | 'payment_received' | 'cancellation' | 'refund';
      message: string;
      read: boolean;
      created_at: string;
    }[]>('/orders/notifications');
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    return apiService.put<void>(`/orders/notifications/${notificationId}/read`);
  }
}

// Create singleton instance
export const orderService = new OrderService();




