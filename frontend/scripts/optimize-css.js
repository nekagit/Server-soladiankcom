#!/usr/bin/env node

/**
 * Soladia Marketplace - CSS Optimization Script
 * Consolidates, optimizes, and minifies CSS files for maximum performance
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  inputDir: './src/styles',
  outputDir: './dist/styles',
  tempDir: './temp/css',
  criticalCSS: './dist/styles/critical.css',
  mainCSS: './dist/styles/main.css',
  variablesCSS: './dist/styles/variables.css',
  darkModeCSS: './dist/styles/dark-mode.css',
  mobileCSS: './dist/styles/mobile.css',
  resetCSS: './dist/styles/reset.css',
  minify: true,
  removeUnused: true,
  generateSourceMaps: true
};

// CSS files to process
const cssFiles = [
  'variables.css',
  'reset.css', 
  'dark-mode.css',
  'mobile-optimization.css',
  'global-optimized.css',
  'category-pages.css',
  'product-detail.css',
  'critical.css'
];

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`Error reading file ${filePath}: ${error.message}`, 'error');
    return '';
  }
}

function writeFile(filePath, content) {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
    log(`✓ Created ${filePath}`, 'success');
  } catch (error) {
    log(`Error writing file ${filePath}: ${error.message}`, 'error');
  }
}

// CSS optimization functions
function removeDuplicateVariables(css) {
  const lines = css.split('\n');
  const seen = new Set();
  const result = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--soladia-') && trimmed.includes(':')) {
      const varName = trimmed.split(':')[0].trim();
      if (seen.has(varName)) {
        log(`Removing duplicate variable: ${varName}`, 'warning');
        continue;
      }
      seen.add(varName);
    }
    result.push(line);
  }
  
  return result.join('\n');
}

function removeUnusedCSS(css, usedClasses = []) {
  // This is a simplified version - in production, use PurgeCSS
  const lines = css.split('\n');
  const result = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      result.push(line);
      continue;
    }
    
    // Check if it's a CSS rule
    if (trimmed.includes('{') && !trimmed.includes('@')) {
      const selector = trimmed.split('{')[0].trim();
      
      // Skip if it's a utility class or common selector
      if (selector.includes('.') && !usedClasses.some(cls => selector.includes(cls))) {
        // Skip unused classes (simplified check)
        if (selector.includes('.unused-') || selector.includes('.deprecated-')) {
          log(`Removing unused CSS: ${selector}`, 'warning');
          continue;
        }
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

function optimizeCSS(css) {
  let optimized = css;
  
  // Remove duplicate variables
  optimized = removeDuplicateVariables(optimized);
  
  // Remove unused CSS (simplified)
  optimized = removeUnusedCSS(optimized);
  
  // Remove extra whitespace
  optimized = optimized
    .replace(/\s+/g, ' ')
    .replace(/;\s*}/g, '}')
    .replace(/{\s*/g, '{')
    .replace(/;\s*/g, ';')
    .replace(/\s*,\s*/g, ',');
  
  // Remove comments (except important ones)
  optimized = optimized.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, (match) => {
    if (match.includes('!important') || match.includes('TODO') || match.includes('FIXME')) {
      return match;
    }
    return '';
  });
  
  return optimized;
}

function minifyCSS(css) {
  return css
    .replace(/\s+/g, ' ')
    .replace(/;\s*}/g, '}')
    .replace(/{\s*/g, '{')
    .replace(/;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*>\s*/g, '>')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s*~\s*/g, '~')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .trim();
}

function generateCriticalCSS(css) {
  // Extract critical above-the-fold CSS
  const criticalSelectors = [
    'html', 'body', 'nav', '.soladia-logo', '.hero-section', 
    '.hero-title', '.hero-subtitle', '.btn-primary', '.btn-secondary',
    '.card', '.product-card', '.mobile-nav', '.mobile-header'
  ];
  
  const lines = css.split('\n');
  const criticalCSS = [];
  let inRule = false;
  let currentRule = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.includes('{')) {
      const selector = trimmed.split('{')[0].trim();
      if (criticalSelectors.some(critical => selector.includes(critical))) {
        inRule = true;
        currentRule = line;
        continue;
      }
    }
    
    if (inRule) {
      currentRule += '\n' + line;
      if (trimmed.includes('}')) {
        criticalCSS.push(currentRule);
        inRule = false;
        currentRule = '';
      }
    }
  }
  
  return criticalCSS.join('\n');
}

function consolidateCSS() {
  log('Starting CSS consolidation and optimization...', 'info');
  
  // Ensure directories exist
  ensureDir(config.tempDir);
  ensureDir(config.outputDir);
  
  let consolidatedCSS = '';
  let criticalCSS = '';
  let variablesCSS = '';
  let darkModeCSS = '';
  let mobileCSS = '';
  let resetCSS = '';
  
  // Process each CSS file
  for (const file of cssFiles) {
    const filePath = path.join(config.inputDir, file);
    const content = readFile(filePath);
    
    if (!content) {
      log(`Skipping empty file: ${file}`, 'warning');
      continue;
    }
    
    log(`Processing ${file}...`, 'info');
    
    // Categorize CSS files
    if (file === 'variables.css') {
      variablesCSS = content;
    } else if (file === 'dark-mode.css') {
      darkModeCSS = content;
    } else if (file === 'mobile-optimization.css') {
      mobileCSS = content;
    } else if (file === 'reset.css') {
      resetCSS = content;
    } else if (file === 'critical.css') {
      criticalCSS = content;
    } else {
      consolidatedCSS += '\n' + content;
    }
  }
  
  // Optimize each CSS category
  log('Optimizing CSS files...', 'info');
  
  variablesCSS = optimizeCSS(variablesCSS);
  darkModeCSS = optimizeCSS(darkModeCSS);
  mobileCSS = optimizeCSS(mobileCSS);
  resetCSS = optimizeCSS(resetCSS);
  criticalCSS = optimizeCSS(criticalCSS);
  consolidatedCSS = optimizeCSS(consolidatedCSS);
  
  // Generate critical CSS from main CSS
  const autoCriticalCSS = generateCriticalCSS(consolidatedCSS);
  const finalCriticalCSS = criticalCSS + '\n' + autoCriticalCSS;
  
  // Create main CSS file with proper order
  const mainCSS = [
    '/* Soladia Marketplace - Optimized CSS */',
    '/* Generated on ' + new Date().toISOString() + ' */',
    '',
    '/* Variables */',
    variablesCSS,
    '',
    '/* Reset & Base */',
    resetCSS,
    '',
    '/* Dark Mode */',
    darkModeCSS,
    '',
    '/* Mobile Optimization */',
    mobileCSS,
    '',
    '/* Main Styles */',
    consolidatedCSS
  ].join('\n');
  
  // Write optimized files
  writeFile(config.variablesCSS, variablesCSS);
  writeFile(config.darkModeCSS, darkModeCSS);
  writeFile(config.mobileCSS, mobileCSS);
  writeFile(config.resetCSS, resetCSS);
  writeFile(config.criticalCSS, finalCriticalCSS);
  writeFile(config.mainCSS, mainCSS);
  
  // Generate minified versions
  if (config.minify) {
    log('Generating minified versions...', 'info');
    
    const minifiedCritical = minifyCSS(finalCriticalCSS);
    const minifiedMain = minifyCSS(mainCSS);
    
    writeFile(config.criticalCSS.replace('.css', '.min.css'), minifiedCritical);
    writeFile(config.mainCSS.replace('.css', '.min.css'), minifiedMain);
  }
  
  // Generate source maps
  if (config.generateSourceMaps) {
    log('Generating source maps...', 'info');
    
    const sourceMap = {
      version: 3,
      sources: cssFiles.map(file => `src/styles/${file}`),
      names: [],
      mappings: '',
      file: 'main.css'
    };
    
    writeFile(config.mainCSS + '.map', JSON.stringify(sourceMap, null, 2));
  }
  
  // Generate CSS bundle analysis
  generateBundleAnalysis();
  
  log('CSS optimization completed successfully!', 'success');
}

function generateBundleAnalysis() {
  const analysis = {
    timestamp: new Date().toISOString(),
    files: {},
    totalSize: 0,
    recommendations: []
  };
  
  // Analyze each CSS file
  for (const file of cssFiles) {
    const filePath = path.join(config.inputDir, file);
    const content = readFile(filePath);
    
    if (content) {
      const size = Buffer.byteLength(content, 'utf8');
      analysis.files[file] = {
        size: size,
        sizeKB: Math.round(size / 1024 * 100) / 100,
        lines: content.split('\n').length,
        selectors: (content.match(/\{[^}]*\}/g) || []).length
      };
      analysis.totalSize += size;
    }
  }
  
  // Generate recommendations
  if (analysis.totalSize > 100000) { // 100KB
    analysis.recommendations.push('Consider code splitting for CSS files');
  }
  
  if (analysis.files['global-optimized.css']?.size > 50000) { // 50KB
    analysis.recommendations.push('Global CSS file is large, consider splitting into components');
  }
  
  analysis.recommendations.push('Use CSS custom properties for better maintainability');
  analysis.recommendations.push('Consider using CSS-in-JS for dynamic styles');
  
  // Write analysis file
  writeFile(path.join(config.outputDir, 'bundle-analysis.json'), JSON.stringify(analysis, null, 2));
  
  log(`Total CSS size: ${Math.round(analysis.totalSize / 1024 * 100) / 100}KB`, 'info');
  log(`Files processed: ${Object.keys(analysis.files).length}`, 'info');
}

function installDependencies() {
  log('Installing CSS optimization dependencies...', 'info');
  
  try {
    execSync('npm install --save-dev purgecss postcss postcss-cli autoprefixer cssnano', { stdio: 'inherit' });
    log('Dependencies installed successfully', 'success');
  } catch (error) {
    log('Error installing dependencies: ' + error.message, 'error');
  }
}

function runPurgeCSS() {
  log('Running PurgeCSS to remove unused styles...', 'info');
  
  try {
    const purgeConfig = {
      content: ['./src/**/*.{astro,ts,tsx,js,jsx}'],
      css: ['./dist/styles/*.css'],
      output: './dist/styles/purged/',
      safelist: [
        'soladia-*',
        'mobile-*',
        'animate-*',
        'btn-*',
        'card-*',
        'modal-*',
        'nav-*',
        'hero-*',
        'product-*',
        'category-*'
      ]
    };
    
    writeFile('./purgecss.config.js', `module.exports = ${JSON.stringify(purgeConfig, null, 2)};`);
    execSync('npx purgecss --config ./purgecss.config.js', { stdio: 'inherit' });
    
    log('PurgeCSS completed successfully', 'success');
  } catch (error) {
    log('Error running PurgeCSS: ' + error.message, 'error');
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--install')) {
    installDependencies();
    return;
  }
  
  if (args.includes('--purge')) {
    runPurgeCSS();
    return;
  }
  
  if (args.includes('--help')) {
    console.log(`
Soladia Marketplace CSS Optimization Script

Usage: node optimize-css.js [options]

Options:
  --install    Install required dependencies
  --purge      Run PurgeCSS to remove unused styles
  --help       Show this help message

Examples:
  node optimize-css.js --install
  node optimize-css.js --purge
  node optimize-css.js
    `);
    return;
  }
  
  consolidateCSS();
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  consolidateCSS,
  optimizeCSS,
  minifyCSS,
  generateCriticalCSS,
  generateBundleAnalysis
};