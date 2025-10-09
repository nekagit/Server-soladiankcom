/**
 * Lazy loading service for images, components, and resources
 */

export interface LazyLoadOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  placeholder?: string;
  error?: string;
  loading?: 'lazy' | 'eager';
}

export interface LazyImageOptions extends LazyLoadOptions {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export interface LazyComponentOptions extends LazyLoadOptions {
  component: () => Promise<any>;
  fallback?: any;
  error?: any;
  onLoad?: () => void;
  onError?: () => void;
}

class LazyLoadingService {
  private observer: IntersectionObserver | null = null;
  private observedElements: Map<Element, LazyLoadOptions> = new Map();
  private loadedComponents: Map<string, any> = new Map();

  constructor() {
    this.initializeObserver();
  }

  private initializeObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadElement(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  }

  private loadElement(element: Element): void {
    const options = this.observedElements.get(element);
    if (!options) return;

    // Load based on element type
    if (element.tagName === 'IMG') {
      this.loadImage(element as HTMLImageElement, options as LazyImageOptions);
    } else if (element.hasAttribute('data-lazy-component')) {
      this.loadComponent(element, options as LazyComponentOptions);
    } else if (element.hasAttribute('data-lazy-src')) {
      this.loadResource(element, options);
    }

    // Remove from observer if once is true
    if (options.once) {
      this.unobserve(element);
    }
  }

  private loadImage(img: HTMLImageElement, options: LazyImageOptions): void {
    const src = img.getAttribute('data-lazy-src') || options.src;
    if (!src) return;

    // Set placeholder if provided
    if (options.placeholder) {
      img.src = options.placeholder;
    }

    // Create new image to preload
    const newImg = new Image();
    
    newImg.onload = () => {
      img.src = src;
      img.classList.add('lazy-loaded');
      options.onLoad?.();
    };

    newImg.onerror = () => {
      if (options.error) {
        img.src = options.error;
      }
      img.classList.add('lazy-error');
      options.onError?.();
    };

    newImg.src = src;
  }

  private async loadComponent(element: Element, options: LazyComponentOptions): Promise<void> {
    const componentName = element.getAttribute('data-lazy-component');
    if (!componentName) return;

    try {
      // Check if component is already loaded
      if (this.loadedComponents.has(componentName)) {
        this.renderComponent(element, this.loadedComponents.get(componentName));
        return;
      }

      // Show fallback if provided
      if (options.fallback) {
        element.innerHTML = options.fallback;
      }

      // Load component
      const component = await options.component();
      this.loadedComponents.set(componentName, component);
      
      // Render component
      this.renderComponent(element, component);
      
      options.onLoad?.();
    } catch (error) {
      console.error('Failed to load component:', error);
      
      if (options.error) {
        element.innerHTML = options.error;
      }
      
      options.onError?.();
    }
  }

  private renderComponent(element: Element, component: any): void {
    if (typeof component === 'function') {
      element.innerHTML = component();
    } else if (typeof component === 'string') {
      element.innerHTML = component;
    } else if (component.default) {
      element.innerHTML = component.default();
    }
  }

  private loadResource(element: Element, options: LazyLoadOptions): void {
    const src = element.getAttribute('data-lazy-src');
    if (!src) return;

    // Load resource based on type
    if (element.tagName === 'IFRAME') {
      (element as HTMLIFrameElement).src = src;
    } else if (element.tagName === 'VIDEO') {
      (element as HTMLVideoElement).src = src;
    } else if (element.tagName === 'AUDIO') {
      (element as HTMLAudioElement).src = src;
    } else {
      // For other elements, load as background image or content
      element.style.backgroundImage = `url(${src})`;
    }

    element.classList.add('lazy-loaded');
  }

  public observeImage(img: HTMLImageElement, options: LazyImageOptions): void {
    if (!this.observer) return;

    // Set up lazy loading attributes
    img.setAttribute('data-lazy-src', options.src);
    img.setAttribute('alt', options.alt);
    
    if (options.width) img.setAttribute('width', options.width.toString());
    if (options.height) img.setAttribute('height', options.height.toString());
    if (options.className) img.className = options.className;

    // Set placeholder
    if (options.placeholder) {
      img.src = options.placeholder;
    }

    // Add loading class
    img.classList.add('lazy-loading');

    // Observe element
    this.observer.observe(img);
    this.observedElements.set(img, options);
  }

  public observeComponent(element: Element, options: LazyComponentOptions): void {
    if (!this.observer) return;

    element.setAttribute('data-lazy-component', 'true');
    element.classList.add('lazy-loading');

    this.observer.observe(element);
    this.observedElements.set(element, options);
  }

  public observeResource(element: Element, src: string, options: LazyLoadOptions = {}): void {
    if (!this.observer) return;

    element.setAttribute('data-lazy-src', src);
    element.classList.add('lazy-loading');

    this.observer.observe(element);
    this.observedElements.set(element, options);
  }

  public unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    this.observedElements.delete(element);
  }

  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observedElements.clear();
  }

  // Utility methods for common lazy loading patterns
  public lazyLoadImages(selector: string = 'img[data-lazy-src]', options: LazyLoadOptions = {}): void {
    const images = document.querySelectorAll(selector);
    images.forEach((img) => {
      this.observeResource(img as HTMLImageElement, img.getAttribute('data-lazy-src') || '', options);
    });
  }

  public lazyLoadComponents(selector: string = '[data-lazy-component]', options: LazyLoadOptions = {}): void {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      this.observeComponent(element, options as LazyComponentOptions);
    });
  }

  public lazyLoadIframes(selector: string = 'iframe[data-lazy-src]', options: LazyLoadOptions = {}): void {
    const iframes = document.querySelectorAll(selector);
    iframes.forEach((iframe) => {
      this.observeResource(iframe, iframe.getAttribute('data-lazy-src') || '', options);
    });
  }

  public lazyLoadVideos(selector: string = 'video[data-lazy-src]', options: LazyLoadOptions = {}): void {
    const videos = document.querySelectorAll(selector);
    videos.forEach((video) => {
      this.observeResource(video, video.getAttribute('data-lazy-src') || '', options);
    });
  }

  // Preload critical resources
  public preloadCriticalResources(resources: Array<{ href: string; as: string; type?: string }>): void {
    resources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      document.head.appendChild(link);
    });
  }

  // Prefetch resources for better performance
  public prefetchResources(resources: string[]): void {
    resources.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  // Load component with error handling
  public async loadComponentWithErrorHandling(
    componentName: string,
    componentLoader: () => Promise<any>,
    fallback?: any,
    error?: any
  ): Promise<any> {
    try {
      if (this.loadedComponents.has(componentName)) {
        return this.loadedComponents.get(componentName);
      }

      const component = await componentLoader();
      this.loadedComponents.set(componentName, component);
      return component;
    } catch (err) {
      console.error(`Failed to load component ${componentName}:`, err);
      return error || fallback || null;
    }
  }
}

// Create singleton instance
export const lazyLoadingService = new LazyLoadingService();

// Export types
export type { LazyLoadOptions, LazyImageOptions, LazyComponentOptions };




