/**
 * Products API service
 */

import { apiService, ApiResponse, PaginatedResponse } from './api';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  category_id: number;
  category_name?: string;
  seller_id: number;
  seller_name?: string;
  seller_avatar?: string;
  images: string[];
  is_nft: boolean;
  solana_supported: boolean;
  status: 'active' | 'inactive' | 'sold' | 'draft';
  created_at: string;
  updated_at: string;
  tags?: string[];
  metadata?: Record<string, any>;
  view_count?: number;
  like_count?: number;
  is_featured?: boolean;
  is_trending?: boolean;
}

export interface ProductCreateRequest {
  name: string;
  description: string;
  price: number;
  currency: string;
  category_id: number;
  images: string[];
  is_nft: boolean;
  solana_supported: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {
  status?: 'active' | 'inactive' | 'sold' | 'draft';
}

export interface ProductFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  currency?: string;
  is_nft?: boolean;
  solana_supported?: boolean;
  seller_id?: number;
  status?: string;
  tags?: string[];
  search?: string;
  sort_by?: 'price' | 'name' | 'created_at' | 'view_count' | 'like_count';
  sort_order?: 'asc' | 'desc';
}

export interface ProductSearchRequest {
  query: string;
  filters?: ProductFilters;
  page?: number;
  limit?: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  slug: string;
  parent_id?: number;
  image?: string;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

export class ProductService {
  /**
   * Get all products with pagination and filters
   */
  async getProducts(
    page: number = 1,
    limit: number = 10,
    filters?: ProductFilters
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    const params = {
      page,
      limit,
      ...filters,
    };

    return apiService.getPaginated<Product>('/products', page, limit, params);
  }

  /**
   * Get product by ID
   */
  async getProduct(id: number): Promise<ApiResponse<Product>> {
    return apiService.get<Product>(`/products/${id}`);
  }

  /**
   * Create new product
   */
  async createProduct(productData: ProductCreateRequest): Promise<ApiResponse<Product>> {
    return apiService.post<Product>('/products', productData);
  }

  /**
   * Update product
   */
  async updateProduct(id: number, productData: ProductUpdateRequest): Promise<ApiResponse<Product>> {
    return apiService.put<Product>(`/products/${id}`, productData);
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/products/${id}`);
  }

  /**
   * Search products
   */
  async searchProducts(searchRequest: ProductSearchRequest): Promise<ApiResponse<Product[]>> {
    const { query, filters, page = 1, limit = 10 } = searchRequest;
    
    return apiService.search<Product>('/products/search', query, {
      ...filters,
      page,
      limit,
    });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<Product[]>> {
    return apiService.get<Product[]>(`/products/featured?limit=${limit}`);
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10): Promise<ApiResponse<Product[]>> {
    return apiService.get<Product[]>(`/products/trending?limit=${limit}`);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: number,
    page: number = 1,
    limit: number = 10,
    filters?: Omit<ProductFilters, 'category'>
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return this.getProducts(page, limit, { ...filters, category: categoryId.toString() });
  }

  /**
   * Get products by seller
   */
  async getProductsBySeller(
    sellerId: number,
    page: number = 1,
    limit: number = 10,
    filters?: Omit<ProductFilters, 'seller_id'>
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return this.getProducts(page, limit, { ...filters, seller_id: sellerId });
  }

  /**
   * Get user's products
   */
  async getMyProducts(
    page: number = 1,
    limit: number = 10,
    filters?: Omit<ProductFilters, 'seller_id'>
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return apiService.getPaginated<Product>('/products/my', page, limit, filters);
  }

  /**
   * Like/unlike product
   */
  async toggleLike(productId: number): Promise<ApiResponse<{ liked: boolean; like_count: number }>> {
    return apiService.post<{ liked: boolean; like_count: number }>(`/products/${productId}/like`);
  }

  /**
   * Get product likes
   */
  async getProductLikes(productId: number): Promise<ApiResponse<{ liked: boolean; like_count: number }>> {
    return apiService.get<{ liked: boolean; like_count: number }>(`/products/${productId}/likes`);
  }

  /**
   * Increment product view count
   */
  async incrementViewCount(productId: number): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/products/${productId}/view`);
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(productId: number): Promise<ApiResponse<{
    view_count: number;
    like_count: number;
    share_count: number;
    conversion_rate: number;
  }>> {
    return apiService.get<{
      view_count: number;
      like_count: number;
      share_count: number;
      conversion_rate: number;
    }>(`/products/${productId}/analytics`);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return apiService.get<Category[]>('/categories');
  }

  /**
   * Get category by ID
   */
  async getCategory(id: number): Promise<ApiResponse<Category>> {
    return apiService.get<Category>(`/categories/${id}`);
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    return apiService.get<Category>(`/categories/slug/${slug}`);
  }

  /**
   * Create category
   */
  async createCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Category>> {
    return apiService.post<Category>('/categories', categoryData);
  }

  /**
   * Update category
   */
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiService.put<Category>(`/categories/${id}`, categoryData);
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/categories/${id}`);
  }

  /**
   * Upload product image
   */
  async uploadProductImage(file: File, productId?: number): Promise<ApiResponse<{ url: string; filename: string }>> {
    return apiService.upload<{ url: string; filename: string }>('/products/upload-image', file, { product_id: productId });
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: number, imageUrl: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/products/${productId}/images`, {
      body: JSON.stringify({ image_url: imageUrl }),
    });
  }
}

// Create singleton instance
export const productService = new ProductService();



