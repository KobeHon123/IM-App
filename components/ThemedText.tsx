import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

/**
 * Custom Text component that prevents font scaling based on system font size settings.
 * This ensures the app UI remains consistent and readable regardless of user font size preferences.
 * 
 * Usage: Import and use exactly like react-native Text, but with controlled font scaling
 * - By default, maxFontSizeMultiplier is set to 1.2 (20% scaling allowed)
 * - For buttons and labels where scaling shouldn't happen, use maxFontSizeMultiplier={1}
 * - Can override with custom maxFontSizeMultiplier value if needed
 */
export const ThemedText = React.forwardRef<RNText, TextProps & { allowFontScaling?: boolean; maxFontSizeMultiplier?: number }>(
  (
    {
      maxFontSizeMultiplier = 1.2,
      allowFontScaling = true,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <RNText
        ref={ref}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        allowFontScaling={allowFontScaling}
        {...props}
        style={style}
      />
    );
  }
);

ThemedText.displayName = 'ThemedText';
