import { useCallback, useRef, type ComponentRef } from 'react';
import { AccessibilityInfo, Platform, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Reannounce the screen heading when a module becomes active, including when
// returning to an already-mounted Home screen in the navigation stack.
export function useRouteHeadingFocus() {
  const heading = useRef<ComponentRef<typeof Text>>(null);
  useFocusEffect(useCallback(() => {
    const frame = requestAnimationFrame(() => {
      if (!heading.current) return;
      heading.current.focus();
      if (Platform.OS !== 'web') AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
    });
    return () => cancelAnimationFrame(frame);
  }, []));
  return heading;
}
