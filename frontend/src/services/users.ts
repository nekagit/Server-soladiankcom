/**
 * Users API service
 */

import { apiService, ApiResponse, PaginatedResponse } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  wallet_address?: string;
  wallet_type?: 'phantom' | 'solflare' | 'backpack';
  is_verified: boolean;
  is_seller: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  profile_views?: number;
  followers_count?: number;
  following_count?: number;
  products_count?: number;
  orders_count?: number;
  rating?: number;
  reviews_count?: number;
}

export interface UserUpdateRequest {
  first_name?: string;
  last_name?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar?: string;
}

export interface UserFilters {
  search?: string;
  is_seller?: boolean;
  is_verified?: boolean;
  location?: string;
  sort_by?: 'created_at' | 'username' | 'rating' | 'products_count';
  sort_order?: 'asc' | 'desc';
}

export interface UserStats {
  total_users: number;
  new_users_this_month: number;
  verified_users: number;
  seller_users: number;
  active_users: number;
  users_by_month: Record<string, number>;
}

export interface FollowRequest {
  user_id: number;
}

export interface UserProfile {
  user: User;
  is_following: boolean;
  followers: User[];
  following: User[];
  recent_products: Array<{
    id: number;
    name: string;
    price: number;
    currency: string;
    image: string;
    created_at: string;
  }>;
  recent_orders: Array<{
    id: number;
    product_name: string;
    total_price: number;
    currency: string;
    status: string;
    created_at: string;
  }>;
}

export class UserService {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(
    page: number = 1,
    limit: number = 10,
    filters?: UserFilters
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return apiService.getPaginated<User>('/users', page, limit, filters);
  }

  /**
   * Get user by ID
   */
  async getUser(id: number): Promise<ApiResponse<User>> {
    return apiService.get<User>(`/users/${id}`);
  }

  /**
   * Get user profile with additional data
   */
  async getUserProfile(id: number): Promise<ApiResponse<UserProfile>> {
    return apiService.get<UserProfile>(`/users/${id}/profile`);
  }

  /**
   * Update user profile
   */
  async updateProfile(userData: UserUpdateRequest): Promise<ApiResponse<User>> {
    return apiService.put<User>('/users/profile', userData);
  }

  /**
   * Update user avatar
   */
  async updateAvatar(file: File): Promise<ApiResponse<{ avatar_url: string }>> {
    return apiService.upload<{ avatar_url: string }>('/users/avatar', file);
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>('/users/account', {
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return apiService.get<UserStats>('/users/stats');
  }

  /**
   * Get user's followers
   */
  async getFollowers(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return apiService.getPaginated<User>(`/users/${userId}/followers`, page, limit);
  }

  /**
   * Get user's following
   */
  async getFollowing(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return apiService.getPaginated<User>(`/users/${userId}/following`, page, limit);
  }

  /**
   * Follow a user
   */
  async followUser(userId: number): Promise<ApiResponse<{ following: boolean }>> {
    return apiService.post<{ following: boolean }>(`/users/${userId}/follow`);
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: number): Promise<ApiResponse<{ following: boolean }>> {
    return apiService.delete<{ following: boolean }>(`/users/${userId}/follow`);
  }

  /**
   * Check if following a user
   */
  async isFollowing(userId: number): Promise<ApiResponse<{ following: boolean }>> {
    return apiService.get<{ following: boolean }>(`/users/${userId}/following-status`);
  }

  /**
   * Get user's products
   */
  async getUserProducts(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<{
    id: number;
    name: string;
    price: number;
    currency: string;
    image: string;
    status: string;
    created_at: string;
  }>>> {
    return apiService.getPaginated<{
      id: number;
      name: string;
      price: number;
      currency: string;
      image: string;
      status: string;
      created_at: string;
    }>(`/users/${userId}/products`, page, limit);
  }

  /**
   * Get user's orders
   */
  async getUserOrders(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<{
    id: number;
    product_name: string;
    total_price: number;
    currency: string;
    status: string;
    created_at: string;
  }>>> {
    return apiService.getPaginated<{
      id: number;
      product_name: string;
      total_price: number;
      currency: string;
      status: string;
      created_at: string;
    }>(`/users/${userId}/orders`, page, limit);
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<{
    id: number;
    product_id: number;
    product_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }>>> {
    return apiService.getPaginated<{
      id: number;
      product_id: number;
      product_name: string;
      rating: number;
      comment: string;
      created_at: string;
    }>(`/users/${userId}/reviews`, page, limit);
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<{
    id: number;
    product_id: number;
    product_name: string;
    price: number;
    currency: string;
    image: string;
    added_at: string;
  }>>> {
    return apiService.getPaginated<{
      id: number;
      product_id: number;
      product_name: string;
      price: number;
      currency: string;
      image: string;
      added_at: string;
    }>('/users/watchlist', page, limit);
  }

  /**
   * Add product to watchlist
   */
  async addToWatchlist(productId: number): Promise<ApiResponse<void>> {
    return apiService.post<void>('/users/watchlist', { product_id: productId });
  }

  /**
   * Remove product from watchlist
   */
  async removeFromWatchlist(productId: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/users/watchlist/${productId}`);
  }

  /**
   * Check if product is in watchlist
   */
  async isInWatchlist(productId: number): Promise<ApiResponse<{ in_watchlist: boolean }>> {
    return apiService.get<{ in_watchlist: boolean }>(`/users/watchlist/${productId}/status`);
  }

  /**
   * Get user's notifications
   */
  async getNotifications(): Promise<ApiResponse<{
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
  }[]>> {
    return apiService.get<{
      id: number;
      type: string;
      title: string;
      message: string;
      read: boolean;
      created_at: string;
    }[]>('/users/notifications');
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    return apiService.put<void>(`/users/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return apiService.put<void>('/users/notifications/read-all');
  }

  /**
   * Get user's activity feed
   */
  async getActivityFeed(
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<{
    id: number;
    type: 'product_created' | 'product_sold' | 'order_placed' | 'review_posted' | 'followed';
    title: string;
    description: string;
    created_at: string;
    metadata?: Record<string, any>;
  }>>> {
    return apiService.getPaginated<{
      id: number;
      type: 'product_created' | 'product_sold' | 'order_placed' | 'review_posted' | 'followed';
      title: string;
      description: string;
      created_at: string;
      metadata?: Record<string, any>;
    }>('/users/activity', page, limit);
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return apiService.search<User>('/users/search', query, { page, limit });
  }

  /**
   * Get top sellers
   */
  async getTopSellers(limit: number = 10): Promise<ApiResponse<User[]>> {
    return apiService.get<User[]>(`/users/top-sellers?limit=${limit}`);
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(): Promise<ApiResponse<{
    profile_views: number;
    products_views: number;
    orders_count: number;
    revenue: number;
    followers_growth: Array<{ date: string; count: number }>;
    products_created: Array<{ date: string; count: number }>;
  }>> {
    return apiService.get<{
      profile_views: number;
      products_views: number;
      orders_count: number;
      revenue: number;
      followers_growth: Array<{ date: string; count: number }>;
      products_created: Array<{ date: string; count: number }>;
    }>('/users/analytics');
  }
}

// Create singleton instance
export const userService = new UserService();




