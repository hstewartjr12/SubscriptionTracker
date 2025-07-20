import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../../theme/theme';
import { microInteractions } from '../../theme/animations';
import { hapticFeedback } from '../../utils/haptics';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const [elevationValue] = useState(new Animated.Value(2));

  const handlePressIn = () => {
    if (onPress) {
      microInteractions.cardHover(scaleValue, elevationValue);
      hapticFeedback.cardSelect();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      microInteractions.cardLeave(scaleValue, elevationValue);
    }
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.base,
      overflow: 'hidden',
    };

    // Variant styles
    switch (variant) {
      case 'elevated':
        baseStyle.backgroundColor = theme.colors.background.card;
        baseStyle.elevation = 4;
        baseStyle.shadowColor = theme.colors.shadow.medium;
        baseStyle.shadowOffset = { width: 0, height: 2 };
        baseStyle.shadowOpacity = 1;
        baseStyle.shadowRadius = 4;
        break;
      case 'outlined':
        baseStyle.backgroundColor = theme.colors.background.card;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.border.light;
        break;
      case 'flat':
        baseStyle.backgroundColor = theme.colors.background.secondary;
        break;
      default:
        baseStyle.backgroundColor = theme.colors.background.card;
        baseStyle.elevation = 2;
        baseStyle.shadowColor = theme.colors.shadow.light;
        baseStyle.shadowOffset = { width: 0, height: 1 };
        baseStyle.shadowOpacity = 1;
        baseStyle.shadowRadius = 2;
    }

    // Padding styles
    switch (padding) {
      case 'none':
        baseStyle.padding = 0;
        break;
      case 'small':
        baseStyle.padding = theme.spacing[3];
        break;
      case 'large':
        baseStyle.padding = theme.spacing[6];
        break;
      default: // medium
        baseStyle.padding = theme.spacing[4];
    }

    // Margin styles
    switch (margin) {
      case 'small':
        baseStyle.margin = theme.spacing[2];
        break;
      case 'medium':
        baseStyle.margin = theme.spacing[4];
        break;
      case 'large':
        baseStyle.margin = theme.spacing[6];
        break;
      default: // none
        baseStyle.margin = 0;
    }

    return baseStyle;
  };

  const CardContent = (
    <Animated.View
      style={[
        getCardStyle(),
        {
          transform: [{ scale: scaleValue }],
          elevation: elevationValue,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

export default Card; 