/**
 * Mobile Performance Optimization Service
 * Comprehensive mobile performance optimizations for the Soladia marketplace
 */

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

export interface MobileOptimizationConfig {
  enableImageOptimization: boolean;
  enableLazyLoading: boolean;
  enablePreloading: boolean;
  enableServiceWorker: boolean;
  enableCompression: boolean;
  enableCaching: boolean;
  enableCriticalCSS: boolean;
  enableResourceHints: boolean;
  maxImageSize: number;
  compressionLevel: number;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
}

export class MobilePerformanceService {
  private config: MobileOptimizationConfig;
  private metrics: PerformanceMetrics | null = null;
  private observer: PerformanceObserver | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<MobileOptimizationConfig> = {}) {
    this.config = {
      enableImageOptimization: true,
      enableLazyLoading: true,
      enablePreloading: true,
      enableServiceWorker: true,
      enableCompression: true,
      enableCaching: true,
      enableCriticalCSS: true,
      enableResourceHints: true,
      maxImageSize: 1024 * 1024, // 1MB
      compressionLevel: 0.8,
      cacheStrategy: 'balanced',
      ...config
    };
  }

  /**
   * Initialize mobile performance optimizations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Optimize images
      if (this.config.enableImageOptimization) {
        await this.optimizeImages();
      }

      // Setup lazy loading
      if (this.config.enableLazyLoading) {
        this.setupLazyLoading();
      }

      // Setup preloading
      if (this.config.enablePreloading) {
        this.setupPreloading();
      }

      // Setup service worker
      if (this.config.enableServiceWorker) {
        await this.setupServiceWorker();
      }

      // Setup compression
      if (this.config.enableCompression) {
        this.setupCompression();
      }

      // Setup caching
      if (this.config.enableCaching) {
        this.setupCaching();
      }

      // Setup critical CSS
      if (this.config.enableCriticalCSS) {
        this.setupCriticalCSS();
      }

      // Setup resource hints
      if (this.config.enableResourceHints) {
        this.setupResourceHints();
      }

      // Setup mobile-specific optimizations
      this.setupMobileOptimizations();

      this.isInitialized = true;
      console.log('Mobile performance optimizations initialized');
    } catch (error) {
      console.error('Failed to initialize mobile performance optimizations:', error);
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      // Observe different performance entry types
      this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });

      // Get initial metrics
      this.captureInitialMetrics();
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      switch (entry.entryType) {
        case 'navigation':
          this.processNavigationEntry(entry as PerformanceNavigationTiming);
          break;
        case 'paint':
          this.processPaintEntry(entry as PerformancePaintTiming);
          break;
        case 'largest-contentful-paint':
          this.processLCPEntry(entry as PerformanceEntry);
          break;
        case 'first-input':
          this.processFIDEntry(entry as PerformanceEventTiming);
          break;
        case 'layout-shift':
          this.processCLSEntry(entry as PerformanceEntry);
          break;
      }
    });
  }

  /**
   * Process navigation entry
   */
  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.metrics = {
      ...this.metrics,
      loadTime: entry.loadEventEnd - entry.loadEventStart,
      timeToInteractive: entry.domInteractive - entry.navigationStart,
      totalBlockingTime: this.calculateTotalBlockingTime(entry)
    } as PerformanceMetrics;
  }

  /**
   * Process paint entry
   */
  private processPaintEntry(entry: PerformancePaintTiming): void {
    if (entry.name === 'first-contentful-paint') {
      this.metrics = {
        ...this.metrics,
        firstContentfulPaint: entry.startTime
      } as PerformanceMetrics;
    }
  }

  /**
   * Process LCP entry
   */
  private processLCPEntry(entry: PerformanceEntry): void {
    this.metrics = {
      ...this.metrics,
      largestContentfulPaint: entry.startTime
    } as PerformanceMetrics;
  }

  /**
   * Process FID entry
   */
  private processFIDEntry(entry: PerformanceEventTiming): void {
    this.metrics = {
      ...this.metrics,
      firstInputDelay: entry.processingStart - entry.startTime
    } as PerformanceMetrics;
  }

  /**
   * Process CLS entry
   */
  private processCLSEntry(entry: PerformanceEntry): void {
    const clsValue = (entry as any).value || 0;
    this.metrics = {
      ...this.metrics,
      cumulativeLayoutShift: (this.metrics?.cumulativeLayoutShift || 0) + clsValue
    } as PerformanceMetrics;
  }

  /**
   * Calculate total blocking time
   */
  private calculateTotalBlockingTime(entry: PerformanceNavigationTiming): number {
    // This is a simplified calculation
    // In a real implementation, you'd analyze long tasks
    return entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
  }

  /**
   * Capture initial metrics
   */
  private captureInitialMetrics(): void {
    if (this.metrics) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics = {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        timeToInteractive: navigation.domInteractive - navigation.navigationStart,
        totalBlockingTime: 0
      };
    }
  }

  /**
   * Optimize images for mobile
   */
  private async optimizeImages(): Promise<void> {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Add loading="lazy" for better performance
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Add decoding="async" for non-blocking image loading
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }

      // Optimize image sizes based on viewport
      this.optimizeImageSize(img);

      // Add error handling
      img.addEventListener('error', () => {
        this.handleImageError(img);
      });

      // Add load event for performance tracking
      img.addEventListener('load', () => {
        this.trackImageLoad(img);
      });
    });
  }

  /**
   * Optimize image size based on viewport
   */
  private optimizeImageSize(img: HTMLImageElement): void {
    const viewportWidth = window.innerWidth;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const optimalWidth = Math.min(viewportWidth * devicePixelRatio, 1920);

    // Update srcset if not already optimized
    if (!img.hasAttribute('srcset') && img.src) {
      const src = img.src;
      const baseUrl = src.split('?')[0];
      const params = new URLSearchParams(src.split('?')[1] || '');
      
      params.set('w', optimalWidth.toString());
      params.set('q', this.config.compressionLevel.toString());
      
      img.srcset = `${baseUrl}?${params.toString()} ${optimalWidth}w`;
    }
  }

  /**
   * Handle image loading errors
   */
  private handleImageError(img: HTMLImageElement): void {
    // Set placeholder image
    img.src = '/placeholder-image.jpg';
    img.alt = 'Image failed to load';
    
    // Add error class for styling
    img.classList.add('image-error');
    
    console.warn('Image failed to load:', img.src);
  }

  /**
   * Track image load performance
   */
  private trackImageLoad(img: HTMLImageElement): void {
    const loadTime = performance.now();
    console.log(`Image loaded in ${loadTime.toFixed(2)}ms:`, img.src);
  }

  /**
   * Setup lazy loading
   */
  private setupLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      // Observe all images with data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Load image from data-src
   */
  private loadImage(img: HTMLImageElement): void {
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc) {
      img.src = dataSrc;
      img.removeAttribute('data-src');
    }
  }

  /**
   * Setup preloading
   */
  private setupPreloading(): void {
    // Preload critical resources
    this.preloadCriticalResources();

    // Preload next page resources
    this.preloadNextPageResources();

    // Preload fonts
    this.preloadFonts();
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    const criticalResources = [
      '/css/critical.css',
      '/js/critical.js',
      '/images/logo.svg'
    ];

    criticalResources.forEach(resource => {
      this.createPreloadLink(resource);
    });
  }

  /**
   * Preload next page resources
   */
  private preloadNextPageResources(): void {
    // This would be implemented based on user behavior
    // For now, we'll preload common pages
    const commonPages = ['/explore', '/create', '/profile'];
    
    commonPages.forEach(page => {
      this.createPrefetchLink(page);
    });
  }

  /**
   * Preload fonts
   */
  private preloadFonts(): void {
    const fonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
      'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'
    ];

    fonts.forEach(font => {
      this.createPreloadLink(font, 'style');
    });
  }

  /**
   * Create preload link
   */
  private createPreloadLink(href: string, as: string = 'fetch'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  /**
   * Create prefetch link
   */
  private createPrefetchLink(href: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }

  /**
   * Setup service worker
   */
  private async setupServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw-advanced.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Setup compression
   */
  private setupCompression(): void {
    // Enable gzip compression headers
    // This would typically be handled by the server
    console.log('Compression enabled');
  }

  /**
   * Setup caching
   */
  private setupCaching(): void {
    // Setup cache headers and strategies
    // This would typically be handled by the service worker
    console.log('Caching enabled');
  }

  /**
   * Setup critical CSS
   */
  private setupCriticalCSS(): void {
    // Inline critical CSS
    const criticalCSS = this.extractCriticalCSS();
    if (criticalCSS) {
      const style = document.createElement('style');
      style.textContent = criticalCSS;
      document.head.insertBefore(style, document.head.firstChild);
    }
  }

  /**
   * Extract critical CSS
   */
  private extractCriticalCSS(): string {
    // This would extract critical CSS for above-the-fold content
    // For now, return empty string
    return '';
  }

  /**
   * Setup resource hints
   */
  private setupResourceHints(): void {
    // Add DNS prefetch for external domains
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.solana.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  /**
   * Setup mobile-specific optimizations
   */
  private setupMobileOptimizations(): void {
    // Disable zoom on input focus
    this.disableZoomOnInputFocus();

    // Optimize touch events
    this.optimizeTouchEvents();

    // Setup viewport optimization
    this.setupViewportOptimization();

    // Setup battery optimization
    this.setupBatteryOptimization();
  }

  /**
   * Disable zoom on input focus
   */
  private disableZoomOnInputFocus(): void {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      });

      input.addEventListener('blur', () => {
        const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0';
        }
      });
    });
  }

  /**
   * Optimize touch events
   */
  private optimizeTouchEvents(): void {
    // Add touch-action CSS for better touch performance
    const style = document.createElement('style');
    style.textContent = `
      * {
        touch-action: manipulation;
      }
      
      .mobile-btn, .mobile-nav-item, .mobile-drawer-nav-link {
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup viewport optimization
   */
  private setupViewportOptimization(): void {
    // Ensure viewport meta tag is present
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
      document.head.appendChild(viewport);
    }
  }

  /**
   * Setup battery optimization
   */
  private setupBatteryOptimization(): void {
    // Reduce animations on low battery
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2) {
          document.body.classList.add('low-battery');
        }
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Get performance score
   */
  getPerformanceScore(): number {
    if (!this.metrics) return 0;

    let score = 100;

    // FCP score (0-100)
    if (this.metrics.firstContentfulPaint > 1800) score -= 20;
    else if (this.metrics.firstContentfulPaint > 1200) score -= 10;

    // LCP score (0-100)
    if (this.metrics.largestContentfulPaint > 4000) score -= 20;
    else if (this.metrics.largestContentfulPaint > 2500) score -= 10;

    // FID score (0-100)
    if (this.metrics.firstInputDelay > 300) score -= 20;
    else if (this.metrics.firstInputDelay > 100) score -= 10;

    // CLS score (0-100)
    if (this.metrics.cumulativeLayoutShift > 0.25) score -= 20;
    else if (this.metrics.cumulativeLayoutShift > 0.1) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Optimize for mobile network conditions
   */
  optimizeForNetwork(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        // Reduce image quality
        this.config.compressionLevel = 0.6;
        
        // Disable non-critical features
        this.config.enablePreloading = false;
        
        // Apply slow network optimizations
        document.body.classList.add('slow-network');
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const mobilePerformanceService = new MobilePerformanceService();

// Auto-initialize on DOM ready
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mobilePerformanceService.initialize();
  });
}
