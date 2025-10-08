/**
 * Products API service
 * Handles all product-related API calls
 */

import { apiClient, ApiResponse } from './api-client';

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    in_stock: boolean;
    stock_quantity: number;
    rating: number;
    review_count: number;
    seller_id: string;
    seller_name: string;
    created_at: string;
    updated_at: string;
    tags: string[];
    specifications?: Record<string, any>;
    on_sale?: boolean;
    sale_price?: number;
    sale_end_date?: string;
}

export interface ProductFilters {
    category?: string;
    min_price?: number;
    max_price?: number;
    rating?: number;
    in_stock?: boolean;
    on_sale?: boolean;
    search?: string;
    tags?: string[];
    seller_id?: string;
}

export interface ProductSort {
    field: 'price' | 'rating' | 'created_at' | 'title';
    direction: 'asc' | 'desc';
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: ProductSort;
    filters?: ProductFilters;
}

export interface ProductsResponse {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface ProductReview {
    id: string;
    user_id: string;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
    helpful_count: number;
}

export interface ProductStats {
    total_views: number;
    total_sales: number;
    conversion_rate: number;
    average_rating: number;
    total_reviews: number;
}

class ProductsApiService {
    private baseEndpoint = '/products';

    /**
     * Get all products with pagination and filters
     */
    async getProducts(params: PaginationParams = {}): Promise<ApiResponse<ProductsResponse>> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.sort) {
            queryParams.append('sort_by', params.sort.field);
            queryParams.append('sort_order', params.sort.direction);
        }
        if (params.filters) {
            Object.entries(params.filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => queryParams.append(key, v.toString()));
                    } else {
                        queryParams.append(key, value.toString());
                    }
                }
            });
        }

        const endpoint = `${this.baseEndpoint}?${queryParams.toString()}`;
        return apiClient.get<ProductsResponse>(endpoint);
    }

    /**
     * Get product by ID
     */
    async getProduct(id: string): Promise<ApiResponse<Product>> {
        return apiClient.get<Product>(`${this.baseEndpoint}/${id}`);
    }

    /**
     * Create new product
     */
    async createProduct(productData: Partial<Product>): Promise<ApiResponse<Product>> {
        return apiClient.post<Product>(this.baseEndpoint, productData);
    }

    /**
     * Update product
     */
    async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
        return apiClient.put<Product>(`${this.baseEndpoint}/${id}`, productData);
    }

    /**
     * Delete product
     */
    async deleteProduct(id: string): Promise<ApiResponse<void>> {
        return apiClient.delete<void>(`${this.baseEndpoint}/${id}`);
    }

    /**
     * Get product reviews
     */
    async getProductReviews(productId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{
        reviews: ProductReview[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    }>> {
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        return apiClient.get(`${this.baseEndpoint}/${productId}/reviews?${queryParams.toString()}`);
    }

    /**
     * Add product review
     */
    async addProductReview(productId: string, review: {
        rating: number;
        comment: string;
    }): Promise<ApiResponse<ProductReview>> {
        return apiClient.post(`${this.baseEndpoint}/${productId}/reviews`, review);
    }

    /**
     * Get product statistics
     */
    async getProductStats(productId: string): Promise<ApiResponse<ProductStats>> {
        return apiClient.get(`${this.baseEndpoint}/${productId}/stats`);
    }

    /**
     * Search products
     */
    async searchProducts(query: string, filters?: ProductFilters): Promise<ApiResponse<ProductsResponse>> {
        const searchParams = new URLSearchParams({ q: query });

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => searchParams.append(key, v.toString()));
                    } else {
                        searchParams.append(key, value.toString());
                    }
                }
            });
        }

        return apiClient.get(`${this.baseEndpoint}/search?${searchParams.toString()}`);
    }

    /**
     * Get featured products
     */
    async getFeaturedProducts(limit: number = 8): Promise<ApiResponse<Product[]>> {
        return apiClient.get(`${this.baseEndpoint}/featured?limit=${limit}`);
    }

    /**
     * Get related products
     */
    async getRelatedProducts(productId: string, limit: number = 4): Promise<ApiResponse<Product[]>> {
        return apiClient.get(`${this.baseEndpoint}/${productId}/related?limit=${limit}`);
    }

    /**
     * Get product categories
     */
    async getCategories(): Promise<ApiResponse<{
        id: string;
        name: string;
        slug: string;
        product_count: number;
        parent_id?: string;
        children?: any[];
    }[]>> {
        return apiClient.get('/categories');
    }

    /**
     * Upload product image
     */
    async uploadProductImage(productId: string, file: File): Promise<ApiResponse<{
        image_url: string;
        thumbnail_url: string;
    }>> {
        return apiClient.upload(`${this.baseEndpoint}/${productId}/images`, file);
    }

    /**
     * Delete product image
     */
    async deleteProductImage(productId: string, imageUrl: string): Promise<ApiResponse<void>> {
        return apiClient.delete(`${this.baseEndpoint}/${productId}/images`, {
            body: { image_url: imageUrl },
        });
    }

    /**
     * Get user's products
     */
    async getUserProducts(userId?: string, params: PaginationParams = {}): Promise<ApiResponse<ProductsResponse>> {
        const endpoint = userId ? `/users/${userId}/products` : '/me/products';
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.sort) {
            queryParams.append('sort_by', params.sort.field);
            queryParams.append('sort_order', params.sort.direction);
        }

        return apiClient.get(`${endpoint}?${queryParams.toString()}`);
    }

    /**
     * Toggle product favorite
     */
    async toggleFavorite(productId: string): Promise<ApiResponse<{
        is_favorite: boolean;
    }>> {
        return apiClient.post(`${this.baseEndpoint}/${productId}/favorite`);
    }

    /**
     * Get user's favorite products
     */
    async getFavoriteProducts(params: PaginationParams = {}): Promise<ApiResponse<ProductsResponse>> {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        return apiClient.get(`/me/favorites?${queryParams.toString()}`);
    }
}

// Create singleton instance
export const productsApi = new ProductsApiService();

// Export for global access
if (typeof window !== 'undefined') {
    (window as any).productsApi = productsApi;
}
