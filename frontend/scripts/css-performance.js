#!/usr/bin/env node

/**
 * CSS Performance Monitoring Script
 * Analyzes CSS performance and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance analysis function
function analyzeCSSPerformance(cssContent) {
  const analysis = {
    fileSize: cssContent.length,
    lines: cssContent.split('\n').length,
    selectors: 0,
    properties: 0,
    mediaQueries: 0,
    animations: 0,
    gradients: 0,
    shadows: 0,
    transforms: 0,
    issues: [],
    recommendations: []
  };

  // Count selectors
  analysis.selectors = (cssContent.match(/[^{}]+{/g) || []).length;

  // Count properties
  analysis.properties = (cssContent.match(/[^:]+:[^;]+;/g) || []).length;

  // Count media queries
  analysis.mediaQueries = (cssContent.match(/@media/g) || []).length;

  // Count animations
  analysis.animations = (cssContent.match(/@keyframes|animation:/g) || []).length;

  // Count gradients
  analysis.gradients = (cssContent.match(/gradient\(/g) || []).length;

  // Count shadows
  analysis.shadows = (cssContent.match(/box-shadow|text-shadow/g) || []).length;

  // Count transforms
  analysis.transforms = (cssContent.match(/transform:/g) || []).length;

  // Performance issues detection
  if (analysis.animations > 10) {
    analysis.issues.push('Too many animations may impact performance');
    analysis.recommendations.push('Consider reducing animations or using CSS transforms instead');
  }

  if (analysis.gradients > 20) {
    analysis.issues.push('Many gradients can impact rendering performance');
    analysis.recommendations.push('Consider using solid colors or simpler gradients');
  }

  if (analysis.shadows > 30) {
    analysis.issues.push('Excessive use of shadows can slow down rendering');
    analysis.recommendations.push('Reduce shadow usage or use simpler shadow values');
  }

  if (analysis.selectors > 1000) {
    analysis.issues.push('Large number of selectors may impact parsing time');
    analysis.recommendations.push('Consider splitting CSS into smaller files or removing unused styles');
  }

  if (analysis.fileSize > 100000) { // 100KB
    analysis.issues.push('Large CSS file size may impact loading time');
    analysis.recommendations.push('Consider minification, compression, or code splitting');
  }

  // Check for unused CSS patterns
  const unusedPatterns = [
    /\.unused-/g,
    /\.deprecated-/g,
    /\/\* TODO \*\//g,
    /\/\* FIXME \*\//g
  ];

  unusedPatterns.forEach(pattern => {
    const matches = cssContent.match(pattern);
    if (matches) {
      analysis.issues.push(`Found ${matches.length} potentially unused CSS patterns`);
      analysis.recommendations.push('Review and remove unused CSS patterns');
    }
  });

  return analysis;
}

// Generate performance report
function generateReport(analysis) {
  const report = `
# CSS Performance Report

## 📊 Metrics
- **File Size**: ${(analysis.fileSize / 1024).toFixed(2)} KB
- **Lines of Code**: ${analysis.lines}
- **Selectors**: ${analysis.selectors}
- **Properties**: ${analysis.properties}
- **Media Queries**: ${analysis.mediaQueries}
- **Animations**: ${analysis.animations}
- **Gradients**: ${analysis.gradients}
- **Shadows**: ${analysis.shadows}
- **Transforms**: ${analysis.transforms}

## ⚠️ Issues Found
${analysis.issues.length > 0 ? analysis.issues.map(issue => `- ${issue}`).join('\n') : '- No issues detected'}

## 💡 Recommendations
${analysis.recommendations.length > 0 ? analysis.recommendations.map(rec => `- ${rec}`).join('\n') : '- No recommendations'}

## 🎯 Performance Score
${calculatePerformanceScore(analysis)}/100

## 📈 Optimization Potential
${calculateOptimizationPotential(analysis)}%
`;

  return report;
}

// Calculate performance score
function calculatePerformanceScore(analysis) {
  let score = 100;
  
  // Deduct points for issues
  if (analysis.fileSize > 50000) score -= 20; // 50KB
  if (analysis.fileSize > 100000) score -= 30; // 100KB
  if (analysis.animations > 10) score -= 15;
  if (analysis.gradients > 20) score -= 10;
  if (analysis.shadows > 30) score -= 10;
  if (analysis.selectors > 1000) score -= 15;
  if (analysis.issues.length > 0) score -= analysis.issues.length * 5;
  
  return Math.max(0, score);
}

// Calculate optimization potential
function calculateOptimizationPotential(analysis) {
  let potential = 0;
  
  if (analysis.fileSize > 50000) potential += 30;
  if (analysis.animations > 5) potential += 20;
  if (analysis.gradients > 10) potential += 15;
  if (analysis.shadows > 15) potential += 10;
  if (analysis.selectors > 500) potential += 25;
  
  return Math.min(100, potential);
}

// Main analysis function
async function runCSSPerformanceAnalysis() {
  try {
    console.log('🔍 Analyzing CSS performance...');
    
    const cssPath = path.join(__dirname, '../src/styles/global.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    const analysis = analyzeCSSPerformance(cssContent);
    const report = generateReport(analysis);
    
    // Write report to file
    const reportPath = path.join(__dirname, '../css-performance-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log('✅ CSS performance analysis complete!');
    console.log(`📊 Performance Score: ${calculatePerformanceScore(analysis)}/100`);
    console.log(`📈 Optimization Potential: ${calculateOptimizationPotential(analysis)}%`);
    console.log(`📁 Report saved to: ${reportPath}`);
    
    if (analysis.issues.length > 0) {
      console.log('\n⚠️ Issues found:');
      analysis.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
  } catch (error) {
    console.error('❌ CSS performance analysis failed:', error);
    process.exit(1);
  }
}

// Run analysis
runCSSPerformanceAnalysis();
