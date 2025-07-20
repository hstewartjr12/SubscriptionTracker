import React, { useState, useCallback, memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { theme } from '../../theme/theme';
import { microInteractions } from '../../theme/animations';
import { hapticFeedback } from '../../utils/haptics';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = memo(({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  children,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const handlePressIn = useCallback(() => {
    if (!disabled && !loading) {
      microInteractions.buttonPress(scaleValue);
      hapticFeedback.buttonPress();
    }
  }, [disabled, loading, scaleValue]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      onPress();
    }
  }, [disabled, loading, onPress]);

  const getButtonStyle = useCallback((): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.base,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...theme.shadows.sm,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = theme.spacing[3];
        baseStyle.paddingVertical = theme.spacing[2];
        baseStyle.minHeight = 36;
        break;
      case 'large':
        baseStyle.paddingHorizontal = theme.spacing[6];
        baseStyle.paddingVertical = theme.spacing[4];
        baseStyle.minHeight = 56;
        break;
      default: // medium
        baseStyle.paddingHorizontal = theme.spacing[4];
        baseStyle.paddingVertical = theme.spacing[3];
        baseStyle.minHeight = 48;
    }

    // Width style
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = theme.colors.primary[500];
        break;
      case 'secondary':
        baseStyle.backgroundColor = theme.colors.secondary[500];
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.primary[500];
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = theme.colors.error[500];
        break;
    }

    // Disabled styles
    if (disabled) {
      baseStyle.backgroundColor = theme.colors.neutral[300];
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  }, [variant, size, fullWidth, disabled]);

  const getTextStyle = useCallback((): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: 'Medium',
      textAlign: 'center',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.fontSize = theme.typography.size.sm;
        break;
      case 'large':
        baseStyle.fontSize = theme.typography.size.lg;
        break;
      default: // medium
        baseStyle.fontSize = theme.typography.size.base;
    }

    // Variant text styles
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        baseStyle.color = theme.colors.text.inverse;
        break;
      case 'outline':
        baseStyle.color = theme.colors.primary[500];
        break;
      case 'ghost':
        baseStyle.color = theme.colors.primary[500];
        break;
    }

    // Disabled text style
    if (disabled) {
      baseStyle.color = theme.colors.text.disabled;
    }

    return baseStyle;
  }, [variant, size, disabled]);

  // Determine what to render inside the button
  const renderContent = useCallback(() => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' 
            ? theme.colors.primary[500] 
            : theme.colors.text.inverse}
        />
      );
    }

    if (children) {
      return children;
    }

    if (title) {
      return <Text style={[getTextStyle(), textStyle]}>{title}</Text>;
    }

    return null;
  }, [loading, variant, children, title, getTextStyle, textStyle]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
});

Button.displayName = 'Button';

export default Button; 