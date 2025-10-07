#!/usr/bin/env node

/**
 * Test Runner Script
 * Comprehensive test execution with coverage and reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');

// Test configuration
const config = {
  testTypes: ['unit', 'integration', 'e2e'],
  coverageThreshold: 90,
  testTimeout: 30000,
  maxWorkers: 4,
  outputDir: './test-results',
  coverageDir: './coverage'
};

// Test results
let testResults = {
  unit: { passed: 0, failed: 0, total: 0, coverage: 0 },
  integration: { passed: 0, failed: 0, total: 0, coverage: 0 },
  e2e: { passed: 0, failed: 0, total: 0, coverage: 0 }
};

/**
 * Run unit tests
 */
async function runUnitTests() {
  log('\n🧪 Running Unit Tests...', 'bright');
  
  try {
    const command = `npx vitest run --coverage --reporter=verbose --reporter=json --outputFile=${config.outputDir}/unit-results.json`;
    execSync(command, { stdio: 'inherit' });
    
    // Parse results
    const resultsFile = path.join(config.outputDir, 'unit-results.json');
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      testResults.unit.passed = results.numPassedTests || 0;
      testResults.unit.failed = results.numFailedTests || 0;
      testResults.unit.total = results.numTotalTests || 0;
    }
    
    // Get coverage
    const coverageFile = path.join(config.coverageDir, 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      testResults.unit.coverage = coverage.total.lines.pct || 0;
    }
    
    logSuccess(`Unit tests completed: ${testResults.unit.passed}/${testResults.unit.total} passed`);
    logInfo(`Coverage: ${testResults.unit.coverage.toFixed(2)}%`);
    
  } catch (error) {
    logError(`Unit tests failed: ${error.message}`);
    testResults.unit.failed = 1;
  }
}

/**
 * Run integration tests
 */
async function runIntegrationTests() {
  log('\n🔗 Running Integration Tests...', 'bright');
  
  try {
    const command = `npx vitest run --config vitest.integration.config.ts --coverage --reporter=verbose --reporter=json --outputFile=${config.outputDir}/integration-results.json`;
    execSync(command, { stdio: 'inherit' });
    
    // Parse results
    const resultsFile = path.join(config.outputDir, 'integration-results.json');
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      testResults.integration.passed = results.numPassedTests || 0;
      testResults.integration.failed = results.numFailedTests || 0;
      testResults.integration.total = results.numTotalTests || 0;
    }
    
    logSuccess(`Integration tests completed: ${testResults.integration.passed}/${testResults.integration.total} passed`);
    
  } catch (error) {
    logError(`Integration tests failed: ${error.message}`);
    testResults.integration.failed = 1;
  }
}

/**
 * Run E2E tests
 */
async function runE2ETests() {
  log('\n🌐 Running E2E Tests...', 'bright');
  
  try {
    const command = `npx playwright test --reporter=json --output=${config.outputDir}/e2e-results.json`;
    execSync(command, { stdio: 'inherit' });
    
    // Parse results
    const resultsFile = path.join(config.outputDir, 'e2e-results.json');
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      testResults.e2e.passed = results.stats.passed || 0;
      testResults.e2e.failed = results.stats.failed || 0;
      testResults.e2e.total = results.stats.total || 0;
    }
    
    logSuccess(`E2E tests completed: ${testResults.e2e.passed}/${testResults.e2e.total} passed`);
    
  } catch (error) {
    logError(`E2E tests failed: ${error.message}`);
    testResults.e2e.failed = 1;
  }
}

/**
 * Generate test report
 */
function generateTestReport() {
  log('\n📊 Generating Test Report...', 'bright');
  
  const totalPassed = testResults.unit.passed + testResults.integration.passed + testResults.e2e.passed;
  const totalFailed = testResults.unit.failed + testResults.integration.failed + testResults.e2e.failed;
  const totalTests = testResults.unit.total + testResults.integration.total + testResults.e2e.total;
  const overallCoverage = testResults.unit.coverage;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      coverage: overallCoverage,
      success: totalFailed === 0 && overallCoverage >= config.coverageThreshold
    },
    details: {
      unit: testResults.unit,
      integration: testResults.integration,
      e2e: testResults.e2e
    },
    thresholds: {
      coverage: config.coverageThreshold
    }
  };
  
  // Save report
  const reportFile = path.join(config.outputDir, 'test-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  // Display summary
  log('\n📈 Test Summary:', 'bright');
  log(`Total Tests: ${totalTests}`, 'cyan');
  log(`Passed: ${totalPassed}`, 'green');
  log(`Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  log(`Coverage: ${overallCoverage.toFixed(2)}%`, overallCoverage >= config.coverageThreshold ? 'green' : 'yellow');
  log(`Success: ${report.summary.success ? 'YES' : 'NO'}`, report.summary.success ? 'green' : 'red');
  
  // Display detailed results
  log('\n📋 Detailed Results:', 'bright');
  log(`Unit Tests: ${testResults.unit.passed}/${testResults.unit.total} (${testResults.unit.coverage.toFixed(2)}% coverage)`, 'cyan');
  log(`Integration Tests: ${testResults.integration.passed}/${testResults.integration.total}`, 'cyan');
  log(`E2E Tests: ${testResults.e2e.passed}/${testResults.e2e.total}`, 'cyan');
  
  return report;
}

/**
 * Check test coverage
 */
function checkCoverage() {
  const coverageFile = path.join(config.coverageDir, 'coverage-summary.json');
  
  if (!fs.existsSync(coverageFile)) {
    logWarning('Coverage file not found');
    return false;
  }
  
  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  const linesCoverage = coverage.total.lines.pct;
  
  if (linesCoverage < config.coverageThreshold) {
    logError(`Coverage below threshold: ${linesCoverage.toFixed(2)}% < ${config.coverageThreshold}%`);
    return false;
  }
  
  logSuccess(`Coverage meets threshold: ${linesCoverage.toFixed(2)}% >= ${config.coverageThreshold}%`);
  return true;
}

/**
 * Setup test environment
 */
function setupTestEnvironment() {
  log('🔧 Setting up test environment...', 'bright');
  
  // Create output directories
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(config.coverageDir)) {
    fs.mkdirSync(config.coverageDir, { recursive: true });
  }
  
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';
  process.env.PLAYWRIGHT_TEST = 'true';
  
  logSuccess('Test environment setup complete');
}

/**
 * Cleanup test environment
 */
function cleanupTestEnvironment() {
  log('🧹 Cleaning up test environment...', 'bright');
  
  // Clean up temporary files
  const tempFiles = [
    'test-results/temp-*.json',
    'coverage/temp-*',
    'playwright-report/temp-*'
  ];
  
  tempFiles.forEach(pattern => {
    try {
      execSync(`rm -f ${pattern}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore errors
    }
  });
  
  logSuccess('Cleanup complete');
}

/**
 * Main test runner
 */
async function runTests() {
  const startTime = Date.now();
  
  try {
    log('🚀 Starting Comprehensive Test Suite...', 'bright');
    
    // Setup
    setupTestEnvironment();
    
    // Run tests based on command line arguments
    const args = process.argv.slice(2);
    const testTypes = args.length > 0 ? args : config.testTypes;
    
    for (const testType of testTypes) {
      switch (testType) {
        case 'unit':
          await runUnitTests();
          break;
        case 'integration':
          await runIntegrationTests();
          break;
        case 'e2e':
          await runE2ETests();
          break;
        default:
          logWarning(`Unknown test type: ${testType}`);
      }
    }
    
    // Generate report
    const report = generateTestReport();
    
    // Check coverage
    const coveragePassed = checkCoverage();
    
    // Cleanup
    cleanupTestEnvironment();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`\n⏱️  Total execution time: ${duration}s`, 'cyan');
    
    if (report.summary.success && coveragePassed) {
      logSuccess('All tests passed and coverage requirements met!');
      process.exit(0);
    } else {
      logError('Some tests failed or coverage requirements not met');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    cleanupTestEnvironment();
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, runUnitTests, runIntegrationTests, runE2ETests };
