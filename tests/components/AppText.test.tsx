import { render, screen } from '@testing-library/react-native';
import { AppText, AppTextInput } from '../../src/ui/AppText';

// Smoke tests for the shared text primitives: they must render their content and keep the
// dynamic-type ceiling that stops a huge OS font size from breaking fixed-height rows.
describe('AppText', () => {
  it('renders its children', () => {
    render(<AppText>Hello Dhaka</AppText>);
    expect(screen.getByText('Hello Dhaka')).toBeTruthy();
  });

  it('caps the text font-scale multiplier at 1.7', () => {
    render(<AppText>Capped</AppText>);
    expect(screen.getByText('Capped').props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.7);
  });

  it('caps the input font-scale multiplier at 1.5 and stays accessible by label', () => {
    render(<AppTextInput accessibilityLabel="Title" value="" onChangeText={() => {}} />);
    const field = screen.getByLabelText('Title');
    expect(field.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  });

  it('lets a caller override the multiplier', () => {
    render(<AppText maxFontSizeMultiplier={1.2}>Override</AppText>);
    expect(screen.getByText('Override').props.maxFontSizeMultiplier).toBe(1.2);
  });
});
