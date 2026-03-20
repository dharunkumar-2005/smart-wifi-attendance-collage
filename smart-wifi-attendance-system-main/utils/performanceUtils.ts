/**
 * Performance Utilities for Smart Attendance System
 * Includes mobile detection, lazy loading helpers, and optimization utilities
 */

/**
 * Detect if device is mobile/tablet
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
};

/**
 * Get optimized camera constraints based on device
 */
export const getOptimizedCameraConstraints = () => {
  const isMobile = isMobileDevice();
  
  // use very lightweight config for mobile devices
  if (isMobile) {
    return {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      },
      audio: false
    };
  }

  return {
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    audio: false
  };
};

/**
 * Detect if blur effects should be reduced (for mobile)
 */
export const shouldReduceEffects = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isMobile = isMobileDevice();
  // Also check for low-end devices via hardwareConcurrency
  const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  
  return isMobile || isLowEnd;
};

/**
 * Request animation frame wrapped with performance optimization
 */
export const requestOptimizedAnimationFrame = (callback: FrameRequestCallback): number => {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback as any) as any;
  }
  return requestAnimationFrame(callback);
};

/**
 * Debounce function for optimizing frequent updates
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for performance-critical operations
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Create async image loader with intersection observer for lazy loading
 */
export const createLazyImageLoader = (
  imageRef: HTMLImageElement | null,
  srcUrl: string
) => {
  if (!imageRef || !('IntersectionObserver' in window)) {
    // Fallback: load immediately if no intersection observer
    if (imageRef) imageRef.src = srcUrl;
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = srcUrl;
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px' // Start loading 50px before element is visible
  });

  observer.observe(imageRef);
  return observer;
};

/**
 * Check if device supports hardware acceleration
 */
export const supportsGPUAcceleration = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
};

/**
 * Optimize image loading with WebP support fallback
 */
export const getOptimizedImageUrl = (
  jpegUrl: string,
  webpUrl?: string
): string => {
  // Check if browser supports WebP
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  const supportsWebP = canvas.toDataURL('image/webp').indexOf('webp') === 5;
  return supportsWebP && webpUrl ? webpUrl : jpegUrl;
};

/**
 * Memory-efficient ResizeObserver for responsive design
 */
export const observeResizeEfficiently = (
  element: HTMLElement | null,
  callback: (entry: ResizeObserverEntry) => void,
  options?: { debounceMs?: number }
) => {
  if (!element || !('ResizeObserver' in window)) return;

  let throttledCallback = callback;
  if (options?.debounceMs) {
    throttledCallback = debounce(callback, options.debounceMs) as any;
  }

  const observer = new ResizeObserver((entries) => {
    entries.forEach(throttledCallback);
  });

  observer.observe(element);
  return observer;
};
