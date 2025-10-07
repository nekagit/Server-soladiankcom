/**
 * API Service Mock
 * Mock implementation for testing
 */

export const mockApiService = {
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  getOrders: vi.fn(),
  getOrder: vi.fn()
};

export default mockApiService;
