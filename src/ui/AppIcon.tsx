import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { useAppPreferences } from '../app/AppPreferences';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AppIconProps = {
  name: IconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
};

export function AppIcon({ name, size = 22, color, accessibilityLabel }: AppIconProps) {
  const { colors } = useAppPreferences();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? colors.textSecondary} accessibilityLabel={accessibilityLabel} />;
}
