import React, { useState, useCallback, memo } from 'react';
import {
  Image,
  ImageProps,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source' | 'style'> {
  uri?: string;
  placeholder?: string;
  fallback?: string;
  style?: ViewStyle;
  showLoadingIndicator?: boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  uri,
  placeholder,
  fallback,
  style,
  showLoadingIndicator = true,
  onLoadStart,
  onLoadEnd,
  onError,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri || placeholder);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    onLoadEnd?.();
  }, [onLoadEnd]);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    
    // Try fallback if available
    if (fallback && currentUri !== fallback) {
      setCurrentUri(fallback);
      setError(false);
      setLoading(true);
    }
    
    onError?.();
  }, [fallback, currentUri, onError]);

  // Reset when URI changes
  React.useEffect(() => {
    if (uri && uri !== currentUri) {
      setCurrentUri(uri);
      setError(false);
      setLoading(true);
    }
  }, [uri, currentUri]);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: currentUri }}
        style={[styles.image, style] as any}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        resizeMode="cover"
        {...props}
      />
      {showLoadingIndicator && loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary[500]}
          />
        </View>
      )}
      {error && !loading && fallback && (
        <View style={styles.errorContainer}>
          <ActivityIndicator
            size="small"
            color={theme.colors.error[500]}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
  },
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage; 