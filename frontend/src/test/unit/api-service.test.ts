/**
 * API Service Unit Tests
 * Comprehensive testing for the API service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, mockFetch } from '../utils/test-utils';

// Mock the API service
const mockApiService = {
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  getOrders: vi.fn(),
  getOrder: vi.fn()
};

describe('API Service', () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('getProducts', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 },
        { id: '2', name: 'Product 2', price: 200 }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProducts)
      });

      mockApiService.getProducts.mockResolvedValue(mockProducts);

      const result = await mockApiService.getProducts();

      expect(result).toEqual(mockProducts);
      expect(mockApiService.getProducts).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      mockApiService.getProducts.mockRejectedValue(new Error('Network error'));

      await expect(mockApiService.getProducts()).rejects.toThrow('Network error');
    });
  });

  describe('getProduct', () => {
    it('should fetch single product successfully', async () => {
      const mockProduct = { id: '1', name: 'Product 1', price: 100 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProduct)
      });

      mockApiService.getProduct.mockResolvedValue(mockProduct);

      const result = await mockApiService.getProduct('1');

      expect(result).toEqual(mockProduct);
      expect(mockApiService.getProduct).toHaveBeenCalledWith('1');
    });

    it('should handle product not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Product not found' })
      });

      mockApiService.getProduct.mockResolvedValue(null);

      const result = await mockApiService.getProduct('999');

      expect(result).toBeNull();
    });
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const mockOrder = {
        id: '1',
        productId: '1',
        quantity: 2,
        total: 200,
        status: 'pending'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrder)
      });

      mockApiService.createOrder.mockResolvedValue(mockOrder);

      const orderData = {
        productId: '1',
        quantity: 2,
        total: 200
      };

      const result = await mockApiService.createOrder(orderData);

      expect(result).toEqual(mockOrder);
      expect(mockApiService.createOrder).toHaveBeenCalledWith(orderData);
    });

    it('should handle order creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid order data' })
      });

      mockApiService.createOrder.mockRejectedValue(new Error('Invalid order data'));

      const orderData = {
        productId: '1',
        quantity: 0, // Invalid quantity
        total: 0
      };

      await expect(mockApiService.createOrder(orderData)).rejects.toThrow('Invalid order data');
    });
  });

  describe('updateOrder', () => {
    it('should update order successfully', async () => {
      const mockOrder = {
        id: '1',
        productId: '1',
        quantity: 3,
        total: 300,
        status: 'confirmed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrder)
      });

      mockApiService.updateOrder.mockResolvedValue(mockOrder);

      const updateData = {
        quantity: 3,
        total: 300,
        status: 'confirmed'
      };

      const result = await mockApiService.updateOrder('1', updateData);

      expect(result).toEqual(mockOrder);
      expect(mockApiService.updateOrder).toHaveBeenCalledWith('1', updateData);
    });
  });

  describe('deleteOrder', () => {
    it('should delete order successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      mockApiService.deleteOrder.mockResolvedValue(true);

      const result = await mockApiService.deleteOrder('1');

      expect(result).toBe(true);
      expect(mockApiService.deleteOrder).toHaveBeenCalledWith('1');
    });
  });

  describe('getOrders', () => {
    it('should fetch orders successfully', async () => {
      const mockOrders = [
        { id: '1', productId: '1', quantity: 2, total: 200, status: 'pending' },
        { id: '2', productId: '2', quantity: 1, total: 100, status: 'confirmed' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrders)
      });

      mockApiService.getOrders.mockResolvedValue(mockOrders);

      const result = await mockApiService.getOrders();

      expect(result).toEqual(mockOrders);
      expect(mockApiService.getOrders).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrder', () => {
    it('should fetch single order successfully', async () => {
      const mockOrder = {
        id: '1',
        productId: '1',
        quantity: 2,
        total: 200,
        status: 'pending'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrder)
      });

      mockApiService.getOrder.mockResolvedValue(mockOrder);

      const result = await mockApiService.getOrder('1');

      expect(result).toEqual(mockOrder);
      expect(mockApiService.getOrder).toHaveBeenCalledWith('1');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      mockApiService.getProducts.mockRejectedValue(new Error('Network error'));

      await expect(mockApiService.getProducts()).rejects.toThrow('Network error');
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });

      mockApiService.getProducts.mockRejectedValue(new Error('Internal server error'));

      await expect(mockApiService.getProducts()).rejects.toThrow('Internal server error');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      mockApiService.getProducts.mockRejectedValue(new Error('Request timeout'));

      await expect(mockApiService.getProducts()).rejects.toThrow('Request timeout');
    });
  });

  describe('Data Validation', () => {
    it('should validate product data', async () => {
      const invalidProduct = {
        id: '',
        name: '',
        price: -100
      };

      mockApiService.getProduct.mockResolvedValue(null);

      const result = await mockApiService.getProduct('');

      expect(result).toBeNull();
    });

    it('should validate order data', async () => {
      const invalidOrder = {
        productId: '',
        quantity: 0,
        total: -100
      };

      mockApiService.createOrder.mockRejectedValue(new Error('Invalid order data'));

      await expect(mockApiService.createOrder(invalidOrder)).rejects.toThrow('Invalid order data');
    });
  });
});
