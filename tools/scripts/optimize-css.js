#!/usr/bin/env node

/**
 * CSS Optimization Script for Soladia
 * Optimizes CSS files for production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSS optimization function
function optimizeCSS(cssContent) {
  // Remove comments
  let optimized = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove unnecessary whitespace
  optimized = optimized.replace(/\s+/g, ' ');
  
  // Remove empty rules
  optimized = optimized.replace(/[^{}]+{\s*}/g, '');
  
  // Optimize color values
  optimized = optimized.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3');
  
  // Optimize rgba values
  optimized = optimized.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*0\s*\)/g, 'transparent');
  optimized = optimized.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*1\s*\)/g, 'rgb($1,$2,$3)');
  
  // Remove unnecessary semicolons
  optimized = optimized.replace(/;}/g, '}');
  
  // Remove unnecessary quotes
  optimized = optimized.replace(/url\("([^"]+)"\)/g, 'url($1)');
  
  // Optimize font weights
  optimized = optimized.replace(/font-weight:\s*normal/g, 'font-weight:400');
  optimized = optimized.replace(/font-weight:\s*bold/g, 'font-weight:700');
  
  // Optimize zero values
  optimized = optimized.replace(/:\s*0px/g, ':0');
  optimized = optimized.replace(/:\s*0em/g, ':0');
  optimized = optimized.replace(/:\s*0rem/g, ':0');
  
  // Remove unnecessary prefixes
  optimized = optimized.replace(/-webkit-border-radius/g, 'border-radius');
  optimized = optimized.replace(/-moz-border-radius/g, 'border-radius');
  
  return optimized.trim();
}

// Critical CSS extraction
function extractCriticalCSS(cssContent) {
  const criticalSelectors = [
    'html', 'body', 'nav', '.soladia-logo', '.hero-section', 
    '.hero-title', '.hero-subtitle', '.btn-primary', '.btn-secondary'
  ];
  
  const lines = cssContent.split('\n');
  const criticalCSS = [];
  
  for (const line of lines) {
    for (const selector of criticalSelectors) {
      if (line.includes(selector)) {
        criticalCSS.push(line);
        break;
      }
    }
  }
  
  return criticalCSS.join('\n');
}

// Main optimization process
async function optimizeCSSFiles() {
  try {
    console.log('🚀 Starting CSS optimization...');
    
    // Read the main CSS file
    const cssPath = path.join(__dirname, '../../frontend/src/styles/global.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Optimize the main CSS
    const optimizedCSS = optimizeCSS(cssContent);
    
    // Extract critical CSS
    const criticalCSS = extractCriticalCSS(cssContent);
    
    // Write optimized files
    const distPath = path.join(__dirname, '../../frontend/dist/styles');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
    }
    
    // Write optimized CSS
    fs.writeFileSync(
      path.join(distPath, 'global-optimized.css'),
      optimizedCSS
    );
    
    // Write critical CSS
    fs.writeFileSync(
      path.join(distPath, 'critical.css'),
      criticalCSS
    );
    
    // Calculate savings
    const originalSize = cssContent.length;
    const optimizedSize = optimizedCSS.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`✅ CSS optimization complete!`);
    console.log(`📊 Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`📊 Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`📊 Savings: ${savings}%`);
    console.log(`📁 Files written to: ${distPath}`);
    
  } catch (error) {
    console.error('❌ CSS optimization failed:', error);
    process.exit(1);
  }
}

// Run optimization
optimizeCSSFiles();
