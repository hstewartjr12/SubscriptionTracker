import React, { memo } from 'react';
import { Text as RNText, TextStyle, TextProps as RNTextProps } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { theme } from '../../theme/theme';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body2' | 'caption' | 'overline';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'disabled' | 'success' | 'warning' | 'error';
  align?: 'left' | 'center' | 'right' | 'justify';
  style?: TextStyle;
  children?: React.ReactNode;
}

const Text: React.FC<TextProps> = memo(({
  variant = 'body',
  weight = 'normal',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const getFontFamily = (): string => {
    switch (weight) {
      case 'light':
        return 'MLight';
      case 'medium':
        return 'Medium';
      case 'semibold':
        return 'SemiBold';
      case 'bold':
        return 'Bold';
      case 'extrabold':
        return 'Bold'; // Fallback to Bold for extrabold
      default:
        return 'Regular';
    }
  };

  const getFontSize = (): number => {
    switch (variant) {
      case 'h1':
        return RFValue(32);
      case 'h2':
        return RFValue(28);
      case 'h3':
        return RFValue(24);
      case 'h4':
        return RFValue(20);
      case 'h5':
        return RFValue(18);
      case 'h6':
        return RFValue(16);
      case 'body':
        return RFValue(16);
      case 'body2':
        return RFValue(14);
      case 'caption':
        return RFValue(12);
      case 'overline':
        return RFValue(10);
      default:
        return RFValue(16);
    }
  };

  const getColor = (): string => {
    switch (color) {
      case 'primary':
        return theme.colors.text.primary;
      case 'secondary':
        return theme.colors.text.secondary;
      case 'tertiary':
        return theme.colors.text.tertiary;
      case 'inverse':
        return theme.colors.text.inverse;
      case 'disabled':
        return theme.colors.text.disabled;
      case 'success':
        return theme.colors.success[500];
      case 'warning':
        return theme.colors.warning[500];
      case 'error':
        return theme.colors.error[500];
      default:
        return theme.colors.text.primary;
    }
  };

  const getLineHeight = (): number => {
    switch (variant) {
      case 'h1':
      case 'h2':
      case 'h3':
        return getFontSize() * theme.typography.lineHeight.tight;
      case 'h4':
      case 'h5':
      case 'h6':
        return getFontSize() * theme.typography.lineHeight.normal;
      case 'body':
      case 'body2':
        return getFontSize() * theme.typography.lineHeight.relaxed;
      case 'caption':
      case 'overline':
        return getFontSize() * theme.typography.lineHeight.normal;
      default:
        return getFontSize() * theme.typography.lineHeight.relaxed;
    }
  };

  const textStyle: TextStyle = {
    fontFamily: getFontFamily(),
    fontSize: getFontSize(),
    color: getColor(),
    textAlign: align,
    lineHeight: getLineHeight(),
    ...style,
  };

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
});

Text.displayName = 'Text';

export default Text; 