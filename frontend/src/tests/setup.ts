/**
 * Test setup configuration
 * Configures testing environment and global test utilities
 */

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
    },
    writable: true,
});

// Mock window.dispatchEvent
window.dispatchEvent = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock getComputedStyle
window.getComputedStyle = vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn(),
}));

// Setup test environment
beforeAll(() => {
    // Set up any global test configuration
    console.log('Setting up test environment...');
});

afterEach(() => {
    // Clean up after each test
    cleanup();
    localStorageMock.clear();
    vi.clearAllMocks();
});

afterAll(() => {
    // Clean up after all tests
    console.log('Cleaning up test environment...');
});

// Global test utilities
export const testUtils = {
    /**
     * Create mock user data
     */
    createMockUser: (overrides = {}) => ({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        user_type: 'buyer',
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    }),

    /**
     * Create mock product data
     */
    createMockProduct: (overrides = {}) => ({
        id: '1',
        title: 'Test Product',
        description: 'A test product description',
        price: 99.99,
        category: 'Electronics',
        images: ['https://example.com/image.jpg'],
        in_stock: true,
        stock_quantity: 10,
        rating: 4.5,
        review_count: 25,
        seller_id: '1',
        seller_name: 'Test Seller',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tags: ['test', 'electronics'],
        ...overrides,
    }),

    /**
     * Create mock API response
     */
    createMockApiResponse: <T>(data: T, success = true) => ({
        data,
        success,
        message: success ? 'Success' : 'Error',
    }),

    /**
     * Mock fetch response
     */
    mockFetchResponse: (data: any, status = 200) => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data)),
        });
    },

    /**
     * Mock fetch error
     */
    mockFetchError: (message = 'Network error') => {
        (global.fetch as any).mockRejectedValueOnce(new Error(message));
    },

    /**
     * Wait for async operations
     */
    waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Create mock auth state
     */
    createMockAuthState: (isAuthenticated = true, user = null) => ({
        isAuthenticated,
        user: user || (isAuthenticated ? testUtils.createMockUser() : null),
        token: isAuthenticated ? 'mock-token' : null,
        isLoading: false,
        error: null,
    }),
};

// Make test utilities globally available
if (typeof window !== 'undefined') {
    (window as any).testUtils = testUtils;
}
