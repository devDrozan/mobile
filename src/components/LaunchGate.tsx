import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { LaunchScreen } from './LaunchScreen';

export const LAUNCH_DURATION_MS = 3000;

export function LaunchGate({ ready, children }: PropsWithChildren<{ ready: boolean }>) {
  const [visible, setVisible] = useState(false);
  const [elapsed, setElapsed] = useState(false);
  const [finished, setFinished] = useState(false);
  const layoutHandled = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const handleLayout = useCallback(() => {
    if (layoutHandled.current) return;
    layoutHandled.current = true;
    // Start the three seconds after the native cover has gone, so time spent
    // behind it never shortens the branded app view. Web/Expo Go may be no-ops.
    void SplashScreen.hideAsync().catch(() => { /* The app view can still continue. */ })
      .finally(() => { if (active.current) setVisible(true); });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setElapsed(true), LAUNCH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  // Latch completion for this mounted app session, even if readiness later changes.
  if (!finished && elapsed && ready) setFinished(true);

  return finished ? children : <LaunchScreen onLayout={handleLayout} />;
}
