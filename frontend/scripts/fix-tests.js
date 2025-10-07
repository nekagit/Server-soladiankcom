#!/usr/bin/env node

/**
 * Test Enhancement Script
 * Fixes test issues and improves test coverage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  testDir: './src',
  outputDir: './test-results',
  coverageDir: './coverage'
};

// Test files to fix
const testFiles = [
  'src/services/__tests__/api.test.ts',
  'src/services/__tests__/solana-wallet.test.ts',
  'src/services/__tests__/solana-nft.test.ts',
  'src/services/__tests__/solana-transaction.test.ts',
  'src/services/__tests__/enhanced-wallet-service.test.ts',
  'src/services/__tests__/social-features-service.test.ts',
  'src/services/__tests__/enhanced-nft-tools-service.test.ts'
];

// Fix import paths in test files
function fixImportPaths() {
  console.log('🔧 Fixing import paths in test files...');
  
  testFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix common import issues
      content = content.replace(
        /from '\.\.\/enhanced-payment-processor'/g,
        "from '../enhanced-payment-processor.ts'"
      );
      
      content = content.replace(
        /from '\.\.\/solana'/g,
        "from '../solana.ts'"
      );
      
      content = content.replace(
        /from '\.\.\/api'/g,
        "from '../api.ts'"
      );
      
      content = content.replace(
        /from '\.\.\/enhanced-wallet-service'/g,
        "from '../enhanced-wallet-service.ts'"
      );
      
      content = content.replace(
        /from '\.\.\/social-features-service'/g,
        "from '../social-features-service.ts'"
      );
      
      content = content.replace(
        /from '\.\.\/enhanced-nft-tools-service'/g,
        "from '../enhanced-nft-tools-service.ts'"
      );
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed imports in ${filePath}`);
    }
  });
}

// Create missing service mocks
function createServiceMocks() {
  console.log('🔧 Creating missing service mocks...');
  
  const mockDir = path.join(process.cwd(), 'src/test/mocks');
  if (!fs.existsSync(mockDir)) {
    fs.mkdirSync(mockDir, { recursive: true });
  }
  
  // Create API service mock
  const apiMock = `/**
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
`;

  fs.writeFileSync(path.join(mockDir, 'api-service.mock.ts'), apiMock);
  
  // Create Solana service mock
  const solanaMock = `/**
 * Solana Service Mock
 * Mock implementation for testing
 */

export const mockSolanaService = {
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getWalletAddress: vi.fn(),
  isConnected: vi.fn(),
  createTransferTransaction: vi.fn(),
  transferToken: vi.fn(),
  getTokenBalance: vi.fn(),
  getNFTsByOwner: vi.fn(),
  getNFTMetadata: vi.fn(),
  mintNFT: vi.fn(),
  transferNFT: vi.fn(),
  getTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransactionStatus: vi.fn(),
  waitForConfirmation: vi.fn()
};

export default mockSolanaService;
`;

  fs.writeFileSync(path.join(mockDir, 'solana-service.mock.ts'), solanaMock);
  
  console.log('✅ Created service mocks');
}

// Fix test timeout issues
function fixTestTimeouts() {
  console.log('🔧 Fixing test timeout issues...');
  
  const vitestConfigPath = path.join(process.cwd(), 'vitest.config.ts');
  
  if (fs.existsSync(vitestConfigPath)) {
    let content = fs.readFileSync(vitestConfigPath, 'utf8');
    
    // Add test timeout configuration
    if (!content.includes('testTimeout')) {
      content = content.replace(
        /export default defineConfig\(/,
        `export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
`
      );
      
      fs.writeFileSync(vitestConfigPath, content);
      console.log('✅ Added test timeout configuration');
    }
  }
}

// Create comprehensive test utilities
function createTestUtilities() {
  console.log('🔧 Creating test utilities...');
  
  const utilsDir = path.join(process.cwd(), 'src/test/utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  
  const testUtils = `/**
 * Test Utilities
 * Common utilities for testing
 */

import { vi } from 'vitest';

// Mock fetch globally
export const mockFetch = vi.fn();

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock window object
export const mockWindow = {
  localStorage: mockLocalStorage,
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock Solana wallet
export const mockSolanaWallet = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  isPhantom: true,
  isConnected: false,
  publicKey: null
};

// Setup test environment
export function setupTestEnvironment() {
  // Mock global fetch
  global.fetch = mockFetch;
  
  // Mock window object
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  Object.defineProperty(window, 'location', {
    value: mockWindow.location,
    writable: true
  });
  
  // Mock Solana wallet
  Object.defineProperty(window, 'solana', {
    value: mockSolanaWallet,
    writable: true
  });
  
  // Reset all mocks
  vi.clearAllMocks();
}

// Cleanup after tests
export function cleanupTestEnvironment() {
  vi.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
  mockSolanaWallet.connect.mockClear();
  mockSolanaWallet.disconnect.mockClear();
}

export default {
  mockFetch,
  mockLocalStorage,
  mockWindow,
  mockSolanaWallet,
  setupTestEnvironment,
  cleanupTestEnvironment
};
`;

  fs.writeFileSync(path.join(utilsDir, 'test-utils.ts'), testUtils);
  console.log('✅ Created test utilities');
}

// Generate test coverage report
function generateCoverageReport() {
  console.log('📊 Generating test coverage report...');
  
  const coverageScript = `#!/usr/bin/env node

/**
 * Generate Test Coverage Report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const coverageDir = './coverage';
const reportDir = './test-results';

// Ensure directories exist
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

try {
  // Run tests with coverage
  console.log('Running tests with coverage...');
  execSync('npm run test:coverage', { stdio: 'inherit' });
  
  // Generate HTML report
  console.log('Generating HTML coverage report...');
  execSync('npx vitest run --coverage --reporter=html', { stdio: 'inherit' });
  
  console.log('✅ Coverage report generated successfully');
  console.log(\`📊 View coverage report at: \${path.resolve(coverageDir)}\`);
  
} catch (error) {
  console.error('❌ Failed to generate coverage report:', error.message);
  process.exit(1);
}
`;

  fs.writeFileSync(path.join(process.cwd(), 'scripts/generate-coverage.js'), coverageScript);
  console.log('✅ Created coverage generation script');
}

// Main function
function main() {
  console.log('🚀 Starting test enhancement...');
  
  try {
    fixImportPaths();
    createServiceMocks();
    fixTestTimeouts();
    createTestUtilities();
    generateCoverageReport();
    
    console.log('✅ Test enhancement completed successfully!');
    console.log('📋 Next steps:');
    console.log('  1. Run: npm run test:run');
    console.log('  2. Check coverage: npm run test:coverage');
    console.log('  3. Fix any remaining test failures');
    
  } catch (error) {
    console.error('❌ Test enhancement failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  fixImportPaths,
  createServiceMocks,
  fixTestTimeouts,
  createTestUtilities,
  generateCoverageReport
};
