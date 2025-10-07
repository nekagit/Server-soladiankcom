import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiService } from '../api.ts'

// Mock fetch
global.fetch = vi.fn()

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProducts', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = [
        { id: '1', name: 'Test Product', price: 100 },
        { id: '2', name: 'Another Product', price: 200 }
      ]

      // @ts-ignore
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts })
      })

      const result = await apiService.getProducts()

      expect(result).toEqual(mockProducts)
      expect(fetch).toHaveBeenCalledWith('/api/products')
    })

    it('should handle API errors', async () => {
      // @ts-ignore
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(apiService.getProducts()).rejects.toThrow('API Error: 500 Internal Server Error')
    })
  })

  describe('getProduct', () => {
    it('should fetch single product successfully', async () => {
      const mockProduct = { id: '1', name: 'Test Product', price: 100 }

      // @ts-ignore
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct
      })

      const result = await apiService.getProduct('1')

      expect(result).toEqual(mockProduct)
      expect(fetch).toHaveBeenCalledWith('/api/products/1')
    })
  })

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const orderData = { productId: '1', quantity: 2 }
      const mockOrder = { id: 'order123', ...orderData }

      // @ts-ignore
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      })

      const result = await apiService.createOrder(orderData)

      expect(result).toEqual(mockOrder)
      expect(fetch).toHaveBeenCalledWith('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
    })
  })
})


