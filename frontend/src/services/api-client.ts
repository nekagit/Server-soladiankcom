/**
 * Centralized API client for Soladia Marketplace
 * Handles all HTTP requests with proper error handling, authentication, and retry logic
 */

export interface ApiResponse<T = any> {
    data: T;
    success: boolean;
    message?: string;
    errors?: string[];
}

export interface ApiError {
    message: string;
    status: number;
    errors?: string[];
}

export interface RequestConfig {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}

class ApiClient {
    private baseURL: string;
    private defaultTimeout: number = 10000;
    private defaultRetries: number = 3;
    private defaultRetryDelay: number = 1000;

    constructor(baseURL: string = '/api') {
        this.baseURL = baseURL;
    }

    /**
     * Get authentication headers
     */
    private getAuthHeaders(): Record<string, string> {
        const token = localStorage.getItem('auth_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /**
     * Get default headers
     */
    private getDefaultHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...this.getAuthHeaders(),
        };
    }

    /**
     * Handle API errors
     */
    private handleError(error: any): ApiError {
        if (error.name === 'AbortError') {
            return {
                message: 'Request timeout',
                status: 408,
            };
        }

        if (error.response) {
            const { status, data } = error.response;
            return {
                message: data?.message || data?.detail || 'An error occurred',
                status,
                errors: data?.errors || [],
            };
        }

        if (error.request) {
            return {
                message: 'Network error - please check your connection',
                status: 0,
            };
        }

        return {
            message: error.message || 'An unexpected error occurred',
            status: 500,
        };
    }

    /**
     * Retry logic for failed requests
     */
    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        retries: number,
        delay: number
    ): Promise<T> {
        try {
            return await requestFn();
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryRequest(requestFn, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    /**
     * Make HTTP request
     */
    private async request<T>(
        endpoint: string,
        config: RequestConfig = {}
    ): Promise<ApiResponse<T>> {
        const {
            method = 'GET',
            headers = {},
            body,
            timeout = this.defaultTimeout,
            retries = this.defaultRetries,
            retryDelay = this.defaultRetryDelay,
        } = config;

        const url = `${this.baseURL}${endpoint}`;
        const requestHeaders = { ...this.getDefaultHeaders(), ...headers };

        const requestConfig: RequestInit = {
            method,
            headers: requestHeaders,
            signal: AbortSignal.timeout(timeout),
        };

        if (body && method !== 'GET') {
            requestConfig.body = JSON.stringify(body);
        }

        const makeRequest = async (): Promise<ApiResponse<T>> => {
            try {
                const response = await fetch(url, requestConfig);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw {
                        response: {
                            status: response.status,
                            data: errorData,
                        },
                    };
                }

                const data = await response.json();
                return {
                    data,
                    success: true,
                };
            } catch (error) {
                throw this.handleError(error);
            }
        };

        try {
            return await this.retryRequest(makeRequest, retries, retryDelay);
        } catch (error) {
            throw error;
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...config, method: 'POST', body });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...config, method: 'PUT', body });
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }

    /**
     * Upload file
     */
    async upload<T>(endpoint: string, file: File, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
        const formData = new FormData();
        formData.append('file', file);

        const headers = { ...this.getAuthHeaders() };
        delete headers['Content-Type']; // Let browser set it for FormData

        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: formData,
            headers,
        });
    }

    /**
     * Set base URL
     */
    setBaseURL(baseURL: string): void {
        this.baseURL = baseURL;
    }

    /**
     * Set default timeout
     */
    setTimeout(timeout: number): void {
        this.defaultTimeout = timeout;
    }

    /**
     * Set default retries
     */
    setRetries(retries: number): void {
        this.defaultRetries = retries;
    }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export for global access
if (typeof window !== 'undefined') {
    (window as any).apiClient = apiClient;
}
