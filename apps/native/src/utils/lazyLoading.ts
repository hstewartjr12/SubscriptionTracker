import { useState, useEffect, useCallback } from 'react';

// Hook for lazy loading data with pagination
export const useLazyLoading = <T>(
  fetchFunction: (page: number, limit: number) => Promise<T[]>,
  initialLimit: number = 10
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newData = await fetchFunction(page, initialLimit);
      
      if (newData.length < initialLimit) {
        setHasMore(false);
      }

      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, initialLimit, loading, hasMore]);

  const refresh = useCallback(async () => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    await loadMore();
  }, [loadMore]);

  useEffect(() => {
    loadMore();
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

// Hook for debounced search
export const useDebouncedSearch = (delay: number = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
  };
};

// Hook for image preloading
export const useImagePreload = (imageUrls: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const preloadImages = useCallback(async () => {
    setLoading(true);
    
    const newLoadedImages = new Set<string>();
    
    const preloadPromises = imageUrls.map(url => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          newLoadedImages.add(url);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    });

    await Promise.all(preloadPromises);
    setLoadedImages(newLoadedImages);
    setLoading(false);
  }, [imageUrls]);

  useEffect(() => {
    if (imageUrls.length > 0) {
      preloadImages();
    }
  }, [preloadImages]);

  return {
    loadedImages,
    loading,
    preloadImages,
  };
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    memoryUsage: number;
    frameRate: number;
  }>({
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 0,
  });

  const measureRenderTime = useCallback((callback: () => void) => {
    const startTime = performance.now();
    callback();
    const endTime = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime,
    }));
  }, []);

  return {
    metrics,
    measureRenderTime,
  };
};

// Hook for conditional rendering optimization
export const useConditionalRender = <T>(
  condition: boolean,
  data: T,
  fallback: T
) => {
  return condition ? data : fallback;
};

// Hook for expensive computation caching
export const useComputedValue = <T>(
  computeFunction: () => T,
  dependencies: any[]
): T => {
  const [value, setValue] = useState<T>(() => computeFunction());

  useEffect(() => {
    setValue(computeFunction());
  }, dependencies);

  return value;
}; 