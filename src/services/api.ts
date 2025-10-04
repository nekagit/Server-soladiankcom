// API service for Soladia marketplace
import type { 
  ApiResponse, 
  PaginatedResponse, 
  Product, 
  Category, 
  User, 
  Order, 
  Review, 
  Watchlist,
  SearchResults,
  SearchFilters,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CartItem
} from '../types';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = this.getStoredToken();
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.code,
          errorData.details
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<ApiResponse<AuthResponse>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.access_token);
      return response.data;
    }
    
    throw new ApiError('Login failed', 401);
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<ApiResponse<AuthResponse>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.access_token);
      return response.data;
    }
    
    throw new ApiError('Registration failed', 400);
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;
    
    if (!refreshToken) {
      throw new ApiError('No refresh token available', 401);
    }

    const response = await this.request<ApiResponse<AuthResponse>>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (response.success && response.data) {
      this.setToken(response.data.access_token);
      return response.data;
    }
    
    throw new ApiError('Token refresh failed', 401);
  }

  // Product methods
  async getProducts(filters: SearchFilters = {}): Promise<SearchResults> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await this.request<ApiResponse<SearchResults>>(
      `/api/products?${params.toString()}`
    );
    
    return response.data;
  }

  async getProduct(id: number): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>(`/api/products/${id}`);
    return response.data;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    const response = await this.request<ApiResponse<Product[]>>('/api/products/featured');
    return response.data;
  }

  async getTrendingProducts(): Promise<Product[]> {
    const response = await this.request<ApiResponse<Product[]>>('/api/products/trending');
    return response.data;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return response.data;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.request(`/api/products/${id}`, { method: 'DELETE' });
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    const response = await this.request<ApiResponse<Category[]>>('/api/categories');
    return response.data;
  }

  async getCategory(id: number): Promise<Category> {
    const response = await this.request<ApiResponse<Category>>(`/api/categories/${id}`);
    return response.data;
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    const response = await this.request<ApiResponse<User>>('/api/users/me');
    return response.data;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    const response = await this.request<ApiResponse<User>>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
    return response.data;
  }

  // Order methods
  async getOrders(filters: { user_id?: number; seller_id?: number; status?: string } = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await this.request<ApiResponse<Order[]>>(
      `/api/orders?${params.toString()}`
    );
    return response.data;
  }

  async getOrder(id: number): Promise<Order> {
    const response = await this.request<ApiResponse<Order>>(`/api/orders/${id}`);
    return response.data;
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const response = await this.request<ApiResponse<Order>>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    return response.data;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const response = await this.request<ApiResponse<Order>>(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data;
  }

  // Review methods
  async getProductReviews(productId: number): Promise<Review[]> {
    const response = await this.request<ApiResponse<Review[]>>(`/api/reviews/product/${productId}`);
    return response.data;
  }

  async createReview(review: Partial<Review>): Promise<Review> {
    const response = await this.request<ApiResponse<Review>>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    });
    return response.data;
  }

  // Watchlist methods
  async getWatchlist(userId: number): Promise<Watchlist[]> {
    const response = await this.request<ApiResponse<Watchlist[]>>(`/api/watchlist/user/${userId}`);
    return response.data;
  }

  async addToWatchlist(productId: number): Promise<Watchlist> {
    const response = await this.request<ApiResponse<Watchlist>>('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    return response.data;
  }

  async removeFromWatchlist(watchlistId: number): Promise<void> {
    await this.request(`/api/watchlist/${watchlistId}`, { method: 'DELETE' });
  }

  // Cart methods
  async getCart(): Promise<CartItem[]> {
    const response = await this.request<ApiResponse<CartItem[]>>('/api/cart');
    return response.data;
  }

  async addToCart(productId: number, quantity: number = 1): Promise<CartItem> {
    const response = await this.request<ApiResponse<CartItem>>('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    return response.data;
  }

  async updateCartItem(itemId: number, quantity: number): Promise<CartItem> {
    const response = await this.request<ApiResponse<CartItem>>(`/api/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
    return response.data;
  }

  async removeFromCart(itemId: number): Promise<void> {
    await this.request(`/api/cart/${itemId}`, { method: 'DELETE' });
  }

  async clearCart(): Promise<void> {
    await this.request('/api/cart', { method: 'DELETE' });
  }

  // Search methods
  async searchProducts(query: string, filters: Omit<SearchFilters, 'query'> = {}): Promise<SearchResults> {
    return this.getProducts({ ...filters, query });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export { ApiError };
