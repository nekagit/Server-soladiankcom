#!/usr/bin/env node

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
  console.log(`📊 View coverage report at: ${path.resolve(coverageDir)}`);
  
} catch (error) {
  console.error('❌ Failed to generate coverage report:', error.message);
  process.exit(1);
}
