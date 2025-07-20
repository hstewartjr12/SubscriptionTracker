import React from 'react';
import { InteractionManager } from 'react-native';

// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private timers: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  // End timing an operation and record the duration
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`Timer for operation "${operation}" was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }

    return duration;
  }

  // Get average duration for an operation
  getAverageDuration(operation: string): number {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) return 0;

    const sum = durations.reduce((acc, duration) => acc + duration, 0);
    return sum / durations.length;
  }

  // Get all metrics
  getMetrics(): Record<string, { average: number; count: number; min: number; max: number }> {
    const result: Record<string, { average: number; count: number; min: number; max: number }> = {};

    this.metrics.forEach((durations, operation) => {
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const average = this.getAverageDuration(operation);

      result[operation] = {
        average,
        count: durations.length,
        min,
        max,
      };
    });

    return result;
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  // Measure render performance
  measureRender(componentName: string, callback: () => void): void {
    this.startTimer(`render_${componentName}`);
    
    InteractionManager.runAfterInteractions(() => {
      this.endTimer(`render_${componentName}`);
    });

    callback();
  }

  // Measure async operation performance
  async measureAsync<T>(operation: string, asyncCallback: () => Promise<T>): Promise<T> {
    this.startTimer(operation);
    
    try {
      const result = await asyncCallback();
      this.endTimer(operation);
      return result;
    } catch (error) {
      this.endTimer(operation);
      throw error;
    }
  }
}

// Hook for measuring component render performance
export const usePerformanceMeasure = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();

  const measureRender = React.useCallback((callback: () => void) => {
    monitor.measureRender(componentName, callback);
  }, [componentName, monitor]);

  const measureAsync = React.useCallback(<T>(asyncCallback: () => Promise<T>): Promise<T> => {
    return monitor.measureAsync(componentName, asyncCallback);
  }, [componentName, monitor]);

  return { measureRender, measureAsync };
};

// Utility for debouncing expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Utility for throttling expensive operations
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Utility for memoizing expensive calculations
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Utility for measuring memory usage (approximate)
export const getMemoryUsage = (): { used: number; total: number; percentage: number } => {
  if (global.performance && (global.performance as any).memory) {
    const memory = (global.performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }

  // Fallback for platforms without memory API
  return {
    used: 0,
    total: 0,
    percentage: 0,
  };
};

// Utility for checking if device is low-end
export const isLowEndDevice = (): boolean => {
  // This is a simplified check - you might want to implement more sophisticated detection
  const memoryUsage = getMemoryUsage();
  return memoryUsage.total < 50 * 1024 * 1024; // Less than 50MB total memory
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance(); 