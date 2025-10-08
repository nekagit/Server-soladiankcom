/**
 * Performance optimization service
 * Handles lazy loading, image optimization, and performance monitoring
 */

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
}

export interface LazyLoadOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

class PerformanceService {
  private observers: Map<string, IntersectionObserver> = new Map();
  private metrics: PerformanceMetrics | null = null;
  private isMonitoring = false;

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (typeof window === 'undefined') return;

    this.setupPerformanceObserver();
    this.setupResourceHints();
    this.optimizeImages();
    this.setupLazyLoading();
  }

  /**
   * Setup Performance Observer for Core Web Vitals
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics = { ...this.metrics, fcp: fcpEntry.startTime } as PerformanceMetrics;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('FCP observer setup failed:', error);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics = { ...this.metrics, lcp: lastEntry.startTime } as PerformanceMetrics;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP observer setup failed:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.metrics = { ...this.metrics, fid } as PerformanceMetrics;
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID observer setup failed:', error);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics = { ...this.metrics, cls: clsValue } as PerformanceMetrics;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS observer setup failed:', error);
    }
  }

  /**
   * Setup resource hints for better performance
   */
  private setupResourceHints(): void {
    if (typeof document === 'undefined') return;

    // Preconnect to external domains
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.soladia.com',
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload critical resources
    this.preloadCriticalResources();
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    if (typeof document === 'undefined') return;

    const criticalResources = [
      { href: '/src/styles/global.css', as: 'style' },
      { href: '/src/scripts/auth-global.ts', as: 'script' },
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.as === 'style') {
        link.onload = () => {
          link.rel = 'stylesheet';
        };
      }
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize images for better performance
   */
  private optimizeImages(): void {
    if (typeof document === 'undefined') return;

    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      this.lazyLoadImage(img as HTMLImageElement);
    });
  }

  /**
   * Setup lazy loading for images and components
   */
  private setupLazyLoading(): void {
    if (typeof document === 'undefined') return;

    // Lazy load images
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadImage(img);
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Lazy load components
    const componentObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          this.loadComponent(element);
          componentObserver.unobserve(element);
        }
      });
    }, { rootMargin: '100px' });

    document.querySelectorAll('[data-lazy-component]').forEach(component => {
      componentObserver.observe(component);
    });
  }

  /**
   * Lazy load a single image
   */
  private lazyLoadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    img.src = src;
    img.classList.remove('lazy');
    img.classList.add('loaded');
  }

  /**
   * Load image with error handling
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    const imageLoader = new Image();
    imageLoader.onload = () => {
      img.src = src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
    };
    imageLoader.onerror = () => {
      img.classList.add('error');
      console.warn('Failed to load image:', src);
    };
    imageLoader.src = src;
  }

  /**
   * Load lazy component
   */
  private loadComponent(element: HTMLElement): void {
    const componentName = element.dataset.lazyComponent;
    if (!componentName) return;

    // Dynamic import for component
    import(`../components/${componentName}.astro`).then(module => {
      element.innerHTML = module.default;
      element.classList.add('loaded');
    }).catch(error => {
      console.error('Failed to load component:', componentName, error);
      element.classList.add('error');
    });
  }

  /**
   * Create lazy load observer
   */
  createLazyObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: LazyLoadOptions = {}
  ): IntersectionObserver {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };

    return new IntersectionObserver(callback, defaultOptions);
  }

  /**
   * Debounce function for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function for performance
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Get Core Web Vitals score
   */
  getCoreWebVitalsScore(): {
    fcp: 'good' | 'needs-improvement' | 'poor';
    lcp: 'good' | 'needs-improvement' | 'poor';
    fid: 'good' | 'needs-improvement' | 'poor';
    cls: 'good' | 'needs-improvement' | 'poor';
  } | null {
    if (!this.metrics) return null;

    const { fcp, lcp, fid, cls } = this.metrics;

    return {
      fcp: fcp <= 1800 ? 'good' : fcp <= 3000 ? 'needs-improvement' : 'poor',
      lcp: lcp <= 2500 ? 'good' : lcp <= 4000 ? 'needs-improvement' : 'poor',
      fid: fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor',
      cls: cls <= 0.1 ? 'good' : cls <= 0.25 ? 'needs-improvement' : 'poor',
    };
  }

  /**
   * Optimize bundle size
   */
  optimizeBundle(): void {
    if (typeof window === 'undefined') return;

    // Remove unused CSS
    this.removeUnusedCSS();

    // Compress images
    this.compressImages();

    // Minify inline scripts
    this.minifyInlineScripts();
  }

  /**
   * Remove unused CSS
   */
  private removeUnusedCSS(): void {
    // This would typically be done at build time
    // For runtime, we can remove unused classes
    const unusedClasses = this.findUnusedClasses();
    unusedClasses.forEach(className => {
      const elements = document.querySelectorAll(`.${className}`);
      if (elements.length === 0) {
        // Remove CSS rule for unused class
        const styleSheets = document.styleSheets;
        for (let i = 0; i < styleSheets.length; i++) {
          try {
            const rules = styleSheets[i].cssRules;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j] as CSSStyleRule;
              if (rule.selectorText && rule.selectorText.includes(className)) {
                styleSheets[i].deleteRule(j);
                j--;
              }
            }
          } catch (error) {
            // Cross-origin stylesheets can't be accessed
            continue;
          }
        }
      }
    });
  }

  /**
   * Find unused CSS classes
   */
  private findUnusedClasses(): string[] {
    const allClasses = new Set<string>();
    const usedClasses = new Set<string>();

    // Get all CSS classes
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const rules = styleSheets[i].cssRules;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j] as CSSStyleRule;
          if (rule.selectorText) {
            const classes = rule.selectorText.match(/\.[\w-]+/g);
            if (classes) {
              classes.forEach(cls => allClasses.add(cls.substring(1)));
            }
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Get used classes
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      element.className.split(' ').forEach(cls => {
        if (cls.trim()) usedClasses.add(cls.trim());
      });
    });

    // Return unused classes
    return Array.from(allClasses).filter(cls => !usedClasses.has(cls));
  }

  /**
   * Compress images
   */
  private compressImages(): void {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        // Add loading="lazy" if not present
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }

        // Add decoding="async" for better performance
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }
      }
    });
  }

  /**
   * Minify inline scripts
   */
  private minifyInlineScripts(): void {
    const scripts = document.querySelectorAll('script:not([src])');
    scripts.forEach(script => {
      const content = script.textContent;
      if (content) {
        // Basic minification - remove comments and extra whitespace
        const minified = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
          .replace(/\/\/.*$/gm, '') // Remove line comments
          .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
          .trim();

        script.textContent = minified;
      }
    });
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Create singleton instance
export const performanceService = new PerformanceService();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  performanceService.init();
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).performanceService = performanceService;
}