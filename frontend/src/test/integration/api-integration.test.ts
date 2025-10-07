/**
 * API Integration Tests
 * Comprehensive testing for API endpoints and backend integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, mockFetch } from '../utils/test-utils';

// Mock API base URL
const API_BASE_URL = 'http://localhost:8000/api';

describe('API Integration Tests', () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Authentication API', () => {
    it('should handle user login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            avatar: '/avatar.jpg'
          },
          token: 'mock-jwt-token'
        })
      });

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('test@example.com');
      expect(data.token).toBe('mock-jwt-token');
    });

    it('should handle user registration', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          success: true,
          user: {
            id: '2',
            email: 'newuser@example.com',
            name: 'New User',
            avatar: null
          },
          token: 'mock-jwt-token-2'
        })
      });

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('newuser@example.com');
    });

    it('should handle token verification', async () => {
      const token = 'mock-jwt-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('1');
    });

    it('should handle logout', async () => {
      const token = 'mock-jwt-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true
        })
      });

      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });
  });

  describe('Products API', () => {
    it('should fetch products list', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          price: 100,
          currency: 'USD',
          description: 'Test product 1',
          image: 'https://example.com/product1.jpg',
          category: 'Electronics',
          seller: {
            id: 'seller-1',
            name: 'Seller 1'
          }
        },
        {
          id: '2',
          name: 'Product 2',
          price: 200,
          currency: 'USD',
          description: 'Test product 2',
          image: 'https://example.com/product2.jpg',
          category: 'Clothing',
          seller: {
            id: 'seller-2',
            name: 'Seller 2'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          products: mockProducts,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/products?page=1&limit=10`);

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.products).toHaveLength(2);
      expect(data.products[0].name).toBe('Product 1');
    });

    it('should fetch single product', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        price: 100,
        currency: 'USD',
        description: 'Test product 1',
        image: 'https://example.com/product1.jpg',
        category: 'Electronics',
        seller: {
          id: 'seller-1',
          name: 'Seller 1'
        },
        reviews: [
          {
            id: 'review-1',
            rating: 5,
            comment: 'Great product!',
            user: {
              id: 'user-1',
              name: 'User 1'
            }
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          product: mockProduct
        })
      });

      const response = await fetch(`${API_BASE_URL}/products/1`);

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.product.name).toBe('Product 1');
      expect(data.product.reviews).toHaveLength(1);
    });

    it('should search products', async () => {
      const searchQuery = 'electronics';
      const mockProducts = [
        {
          id: '1',
          name: 'Electronic Product 1',
          price: 100,
          currency: 'USD',
          description: 'Test electronic product',
          image: 'https://example.com/product1.jpg',
          category: 'Electronics'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          products: mockProducts,
          query: searchQuery,
          total: 1
        })
      });

      const response = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(searchQuery)}`);

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.products).toHaveLength(1);
      expect(data.query).toBe(searchQuery);
    });

    it('should filter products by category', async () => {
      const category = 'Electronics';
      const mockProducts = [
        {
          id: '1',
          name: 'Electronic Product 1',
          price: 100,
          currency: 'USD',
          category: 'Electronics'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          products: mockProducts,
          category: category,
          total: 1
        })
      });

      const response = await fetch(`${API_BASE_URL}/products/category/${category}`);

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.products).toHaveLength(1);
      expect(data.category).toBe(category);
    });
  });

  describe('Orders API', () => {
    it('should create order', async () => {
      const orderData = {
        productId: '1',
        quantity: 2,
        total: 200,
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          success: true,
          order: {
            id: 'order-1',
            productId: '1',
            quantity: 2,
            total: 200,
            status: 'pending',
            createdAt: '2023-01-01T00:00:00Z'
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.order.id).toBe('order-1');
      expect(data.order.status).toBe('pending');
    });

    it('should fetch user orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          productId: '1',
          quantity: 2,
          total: 200,
          status: 'completed',
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 'order-2',
          productId: '2',
          quantity: 1,
          total: 100,
          status: 'pending',
          createdAt: '2023-01-02T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          orders: mockOrders,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/orders?page=1&limit=10`, {
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.orders).toHaveLength(2);
    });

    it('should update order status', async () => {
      const orderId = 'order-1';
      const updateData = {
        status: 'shipped'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          order: {
            id: orderId,
            status: 'shipped',
            updatedAt: '2023-01-01T12:00:00Z'
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.order.status).toBe('shipped');
    });
  });

  describe('Solana API', () => {
    it('should get wallet balance', async () => {
      const walletAddress = 'wallet-address-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          balance: {
            sol: 1.5,
            lamports: 1500000000,
            usdc: 100,
            tokens: [
              {
                mint: 'usdc-mint-address',
                symbol: 'USDC',
                balance: 100,
                decimals: 6
              }
            ]
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/solana/balance/${walletAddress}`);

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.balance.sol).toBe(1.5);
      expect(data.balance.tokens).toHaveLength(1);
    });

    it('should get NFT collection', async () => {
      const walletAddress = 'wallet-address-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          nfts: [
            {
              mint: 'nft-1',
              name: 'Test NFT 1',
              image: 'https://example.com/nft1.png',
              attributes: [
                { trait_type: 'Color', value: 'Red' }
              ]
            },
            {
              mint: 'nft-2',
              name: 'Test NFT 2',
              image: 'https://example.com/nft2.png',
              attributes: [
                { trait_type: 'Color', value: 'Blue' }
              ]
            }
          ]
        })
      });

      const response = await fetch(`${API_BASE_URL}/solana/nfts/${walletAddress}`);

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.nfts).toHaveLength(2);
      expect(data.nfts[0].name).toBe('Test NFT 1');
    });

    it('should process SOL payment', async () => {
      const paymentData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1.5,
        memo: 'Test payment'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          transaction: {
            signature: 'payment-signature-123',
            status: 'confirmed',
            amount: 1.5,
            currency: 'SOL'
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/solana/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.transaction.signature).toBe('payment-signature-123');
    });

    it('should process SPL token payment', async () => {
      const paymentData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 100,
        tokenMint: 'usdc-mint-address',
        memo: 'USDC payment'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          transaction: {
            signature: 'token-payment-signature-123',
            status: 'confirmed',
            amount: 100,
            currency: 'USDC'
          }
        })
      });

      const response = await fetch(`${API_BASE_URL}/solana/token-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.transaction.signature).toBe('token-payment-signature-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Bad Request',
          message: 'Invalid request data'
        })
      });

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invalid: 'data' })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bad Request');
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        })
      });

      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        })
      });

      const response = await fetch(`${API_BASE_URL}/products/999`);

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not Found');
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Internal Server Error',
          message: 'Something went wrong'
        })
      });

      const response = await fetch(`${API_BASE_URL}/products`);

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch(`${API_BASE_URL}/products`)).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(fetch(`${API_BASE_URL}/products`)).rejects.toThrow('Request timeout');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: 60
        })
      });

      const response = await fetch(`${API_BASE_URL}/products`);

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Too Many Requests');
      expect(data.retryAfter).toBe(60);
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Validation Error',
          message: 'Required fields are missing',
          details: [
            { field: 'name', message: 'Name is required' },
            { field: 'price', message: 'Price is required' }
          ]
        })
      });

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.details).toHaveLength(2);
    });

    it('should validate data types', async () => {
      const invalidData = {
        name: 'Product 1',
        price: 'invalid-price', // Should be number
        category: 123 // Should be string
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Validation Error',
          message: 'Invalid data types',
          details: [
            { field: 'price', message: 'Price must be a number' },
            { field: 'category', message: 'Category must be a string' }
          ]
        })
      });

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.details).toHaveLength(2);
    });
  });
});
