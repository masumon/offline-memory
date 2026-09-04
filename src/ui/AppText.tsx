import { forwardRef, type ComponentRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextProps, type TextInputProps } from 'react-native';

// Thin wrappers over RN's Text / TextInput that put a ceiling on OS font-scaling.
// RN 0.86 dropped `Text.defaultProps`, so a global clamp has to live in a wrapper the
// screens import. `maxFontSizeMultiplier` (not `allowFontScaling={false}`) is the
// accessible choice — large-text users still get bigger type, just not so big it breaks
// fixed-height rows, chips and buttons. Callers can still override per element (the
// spread comes after the default).
const TEXT_CEILING = 1.7;
const INPUT_CEILING = 1.5;

export const AppText = forwardRef<ComponentRef<typeof RNText>, TextProps>(function AppText(props, ref) {
  return <RNText ref={ref} maxFontSizeMultiplier={TEXT_CEILING} {...props} />;
});

export const AppTextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function AppTextInput(props, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={INPUT_CEILING} {...props} />;
});
