/**
 * Performance monitoring and optimization service
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Additional metrics
  loadTime: number;
  domContentLoaded: number;
  windowLoad: number;
  memoryUsage?: number;
  
  // Custom metrics
  apiResponseTime: number;
  imageLoadTime: number;
  componentRenderTime: number;
}

export interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private customMetrics: Map<string, number> = new Map();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResources();
    
    // Monitor navigation timing
    this.observeNavigation();
    
    // Monitor memory usage
    this.observeMemory();
    
    // Monitor custom metrics
    this.observeCustomMetrics();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint
    this.observeLCP();
    
    // First Input Delay
    this.observeFID();
    
    // Cumulative Layout Shift
    this.observeCLS();
    
    // First Contentful Paint
    this.observeFCP();
  }

  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        this.reportMetric('lcp', lastEntry.startTime);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }
  }

  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.reportMetric('fid', this.metrics.fid);
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }
  }

  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
        this.reportMetric('cls', clsValue);
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.fcp = entry.startTime;
          this.reportMetric('fcp', entry.startTime);
        });
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FCP observer not supported:', error);
    }
  }

  private observeResources(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.trackResourceLoad(entry as PerformanceResourceTiming);
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  private observeNavigation(): void {
    if (performance.navigation) {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.metrics.loadTime = navTiming.loadEventEnd - navTiming.navigationStart;
      this.metrics.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
      this.metrics.windowLoad = navTiming.loadEventEnd - navTiming.navigationStart;
      this.metrics.ttfb = navTiming.responseStart - navTiming.navigationStart;
      
      this.reportMetric('loadTime', this.metrics.loadTime);
      this.reportMetric('domContentLoaded', this.metrics.domContentLoaded);
      this.reportMetric('windowLoad', this.metrics.windowLoad);
      this.reportMetric('ttfb', this.metrics.ttfb);
    }
  }

  private observeMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      this.reportMetric('memoryUsage', this.metrics.memoryUsage);
    }
  }

  private observeCustomMetrics(): void {
    // Monitor API response times
    this.monitorAPICalls();
    
    // Monitor image loading
    this.monitorImageLoading();
    
    // Monitor component rendering
    this.monitorComponentRendering();
  }

  private monitorAPICalls(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      this.customMetrics.set('apiResponseTime', duration);
      this.reportMetric('apiResponseTime', duration);
      
      return response;
    };
  }

  private monitorImageLoading(): void {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      const startTime = performance.now();
      
      img.addEventListener('load', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.customMetrics.set('imageLoadTime', duration);
        this.reportMetric('imageLoadTime', duration);
      });
    });
  }

  private monitorComponentRendering(): void {
    // This would be implemented with specific component monitoring
    // For now, we'll use a generic approach
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const startTime = performance.now();
          requestAnimationFrame(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            this.customMetrics.set('componentRenderTime', duration);
            this.reportMetric('componentRenderTime', duration);
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private trackResourceLoad(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name);
    
    switch (resourceType) {
      case 'image':
        this.trackImageLoad(entry);
        break;
      case 'script':
        this.trackScriptLoad(entry);
        break;
      case 'stylesheet':
        this.trackStylesheetLoad(entry);
        break;
      case 'fetch':
        this.trackFetchLoad(entry);
        break;
    }
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.match(/\.(js)$/i)) return 'script';
    if (url.match(/\.(css)$/i)) return 'stylesheet';
    if (url.startsWith('/api/')) return 'fetch';
    return 'other';
  }

  private trackImageLoad(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.startTime;
    this.reportMetric('imageLoadTime', loadTime);
  }

  private trackScriptLoad(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.startTime;
    this.reportMetric('scriptLoadTime', loadTime);
  }

  private trackStylesheetLoad(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.startTime;
    this.reportMetric('stylesheetLoadTime', loadTime);
  }

  private trackFetchLoad(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.startTime;
    this.reportMetric('fetchLoadTime', loadTime);
  }

  public startTiming(name: string): void {
    this.customMetrics.set(`${name}_start`, performance.now());
  }

  public endTiming(name: string): number {
    const startTime = this.customMetrics.get(`${name}_start`);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.customMetrics.set(name, duration);
      this.reportMetric(name, duration);
      return duration;
    }
    return 0;
  }

  public mark(name: string): void {
    if (performance.mark) {
      performance.mark(name);
    }
  }

  public measure(name: string, startMark: string, endMark?: string): void {
    if (performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name);
        if (entries.length > 0) {
          const duration = entries[entries.length - 1].duration;
          this.reportMetric(name, duration);
        }
      } catch (error) {
        console.warn('Measure failed:', error);
      }
    }
  }

  public getMetrics(): PerformanceMetrics {
    return {
      lcp: this.metrics.lcp || 0,
      fid: this.metrics.fid || 0,
      cls: this.metrics.cls || 0,
      fcp: this.metrics.fcp || 0,
      ttfb: this.metrics.ttfb || 0,
      loadTime: this.metrics.loadTime || 0,
      domContentLoaded: this.metrics.domContentLoaded || 0,
      windowLoad: this.metrics.windowLoad || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
      apiResponseTime: this.customMetrics.get('apiResponseTime') || 0,
      imageLoadTime: this.customMetrics.get('imageLoadTime') || 0,
      componentRenderTime: this.customMetrics.get('componentRenderTime') || 0,
    };
  }

  public getCustomMetric(name: string): number | undefined {
    return this.customMetrics.get(name);
  }

  private reportMetric(name: string, value: number): void {
    // Send to analytics service
    this.sendToAnalytics(name, value);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance metric: ${name} = ${value}ms`);
    }
  }

  private sendToAnalytics(name: string, value: number): void {
    // Send to your analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        page_location: window.location.href,
      });
    }
  }

  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceMetrics, PerformanceEntry };


