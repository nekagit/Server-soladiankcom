/**
 * CSS Optimization Tests
 * Tests for CSS consolidation, optimization, and performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Mock CSS content for testing
const mockCSSContent = `
:root {
  --soladia-primary: #E60012;
  --soladia-secondary: #0066CC;
  --soladia-primary: #E60012; /* Duplicate */
  --soladia-accent: #FFD700;
}

.btn-primary {
  background: var(--soladia-primary);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
}

.btn-secondary {
  background: white;
  color: var(--soladia-primary);
  border: 2px solid var(--soladia-primary);
  padding: 1rem 2rem;
  border-radius: 8px;
}

.unused-class {
  display: none;
  color: red;
}

/* Comment to remove */
.deprecated-class {
  background: red;
}
`;

describe('CSS Optimization', () => {
  const testDir = join(process.cwd(), 'test-css');
  const testFile = join(testDir, 'test.css');
  
  beforeEach(() => {
    // Create test directory and file
    if (!existsSync(testDir)) {
      require('fs').mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testFile, mockCSSContent);
  });
  
  afterEach(() => {
    // Clean up test files
    if (existsSync(testFile)) {
      require('fs').unlinkSync(testFile);
    }
    if (existsSync(testDir)) {
      require('fs').rmdirSync(testDir);
    }
  });

  describe('CSS Consolidation', () => {
    it('should consolidate CSS files into main.css', () => {
      const mainCSSPath = join(process.cwd(), 'src/styles/main.css');
      expect(existsSync(mainCSSPath)).toBe(true);
      
      const mainCSS = readFileSync(mainCSSPath, 'utf8');
      expect(mainCSS).toContain('Soladia Marketplace - Consolidated & Optimized CSS');
      expect(mainCSS).toContain('@import');
    });

    it('should include all necessary CSS modules', () => {
      const mainCSSPath = join(process.cwd(), 'src/styles/main.css');
      const mainCSS = readFileSync(mainCSSPath, 'utf8');
      
      expect(mainCSS).toContain('variables.css');
      expect(mainCSS).toContain('reset.css');
      expect(mainCSS).toContain('dark-mode.css');
      expect(mainCSS).toContain('mobile-optimization.css');
    });
  });

  describe('CSS Variables', () => {
    it('should have consistent variable naming', () => {
      const variablesPath = join(process.cwd(), 'src/styles/variables.css');
      const variables = readFileSync(variablesPath, 'utf8');
      
      // Check for proper variable naming convention
      expect(variables).toMatch(/--soladia-[a-z-]+:\s*[^;]+;/);
      expect(variables).toContain('--soladia-primary:');
      expect(variables).toContain('--soladia-secondary:');
      expect(variables).toContain('--soladia-accent:');
    });

    it('should have comprehensive color palette', () => {
      const variablesPath = join(process.cwd(), 'src/styles/variables.css');
      const variables = readFileSync(variablesPath, 'utf8');
      
      // Check for color scale (50-900)
      expect(variables).toContain('--soladia-primary-50:');
      expect(variables).toContain('--soladia-primary-500:');
      expect(variables).toContain('--soladia-primary-900:');
    });

    it('should have proper spacing scale', () => {
      const variablesPath = join(process.cwd(), 'src/styles/variables.css');
      const variables = readFileSync(variablesPath, 'utf8');
      
      expect(variables).toContain('--soladia-space-1:');
      expect(variables).toContain('--soladia-space-4:');
      expect(variables).toContain('--soladia-space-8:');
    });
  });

  describe('Dark Mode Implementation', () => {
    it('should have dark mode variables', () => {
      const darkModePath = join(process.cwd(), 'src/styles/dark-mode.css');
      const darkMode = readFileSync(darkModePath, 'utf8');
      
      expect(darkMode).toContain('[data-theme="dark"]');
      expect(darkMode).toContain('--soladia-bg-primary:');
      expect(darkMode).toContain('--soladia-text-primary:');
    });

    it('should have proper dark mode color values', () => {
      const darkModePath = join(process.cwd(), 'src/styles/dark-mode.css');
      const darkMode = readFileSync(darkModePath, 'utf8');
      
      expect(darkMode).toContain('#0F0F0F'); // Dark background
      expect(darkMode).toContain('#FFFFFF'); // Light text
    });
  });

  describe('Mobile Optimization', () => {
    it('should have mobile-specific styles', () => {
      const mobilePath = join(process.cwd(), 'src/styles/mobile-optimization.css');
      const mobile = readFileSync(mobilePath, 'utf8');
      
      expect(mobile).toContain('.mobile-nav');
      expect(mobile).toContain('.mobile-btn');
      expect(mobile).toContain('.mobile-card');
    });

    it('should have proper touch targets', () => {
      const mobilePath = join(process.cwd(), 'src/styles/mobile-optimization.css');
      const mobile = readFileSync(mobilePath, 'utf8');
      
      expect(mobile).toContain('--mobile-touch-target:');
      expect(mobile).toContain('44px');
    });
  });

  describe('Performance Optimization', () => {
    it('should have optimized animations', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain('will-change: transform');
      expect(main).toContain('will-change: auto');
    });

    it('should have reduced motion support', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain('@media (prefers-reduced-motion: reduce)');
      expect(main).toContain('animation-duration: 0.01ms !important');
    });
  });

  describe('Accessibility', () => {
    it('should have focus indicators', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain(':focus-visible');
      expect(main).toContain('outline: 2px solid');
    });

    it('should have high contrast support', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain('@media (prefers-contrast: high)');
    });

    it('should have screen reader support', () => {
      const resetPath = join(process.cwd(), 'src/styles/reset.css');
      const reset = readFileSync(resetPath, 'utf8');
      
      expect(reset).toContain('.sr-only');
      expect(reset).toContain('.skip-link');
    });
  });

  describe('CSS Structure', () => {
    it('should have proper CSS organization', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      // Check for proper section headers
      expect(main).toContain('/* ========================================');
      expect(main).toContain('NAVIGATION STYLES');
      expect(main).toContain('BUTTON STYLES');
      expect(main).toContain('CARD STYLES');
    });

    it('should use CSS custom properties consistently', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      // Check for consistent use of CSS variables
      expect(main).toMatch(/var\(--soladia-[a-z-]+\)/g);
      expect(main).toContain('var(--soladia-primary)');
      expect(main).toContain('var(--soladia-space-');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-first approach', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain('@media (max-width: 768px)');
      expect(main).toContain('@media (max-width: 640px)');
    });

    it('should have proper breakpoints', () => {
      const variablesPath = join(process.cwd(), 'src/styles/variables.css');
      const variables = readFileSync(variablesPath, 'utf8');
      
      expect(variables).toContain('--soladia-breakpoint-sm:');
      expect(variables).toContain('--soladia-breakpoint-md:');
      expect(variables).toContain('--soladia-breakpoint-lg:');
    });
  });

  describe('CSS Optimization Script', () => {
    it('should have optimization script', () => {
      const scriptPath = join(process.cwd(), 'scripts/optimize-css.js');
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should have proper script structure', () => {
      const scriptPath = join(process.cwd(), 'scripts/optimize-css.js');
      const script = readFileSync(scriptPath, 'utf8');
      
      expect(script).toContain('consolidateCSS');
      expect(script).toContain('optimizeCSS');
      expect(script).toContain('minifyCSS');
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should have reasonable file sizes', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      const mainSize = Buffer.byteLength(main, 'utf8');
      
      // Main CSS should be under 100KB
      expect(mainSize).toBeLessThan(100000);
    });

    it('should have optimized critical CSS', () => {
      const criticalPath = join(process.cwd(), 'src/styles/critical.css');
      if (existsSync(criticalPath)) {
        const critical = readFileSync(criticalPath, 'utf8');
        const criticalSize = Buffer.byteLength(critical, 'utf8');
        
        // Critical CSS should be under 20KB
        expect(criticalSize).toBeLessThan(20000);
      }
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should have vendor prefixes where needed', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain('-webkit-');
      expect(main).toContain('-webkit-backdrop-filter');
    });

    it('should have fallbacks for modern CSS features', () => {
      const mainPath = join(process.cwd(), 'src/styles/main.css');
      const main = readFileSync(mainPath, 'utf8');
      
      expect(main).toContain('backdrop-filter');
      expect(main).toContain('-webkit-backdrop-filter');
    });
  });
});
