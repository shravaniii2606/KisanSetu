import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../components/AppTour.css';

const TOUR_COMPLETED_KEY = 'tourCompleted';

export function useTour(steps, { autoStart = true, enabled = true } = {}) {
  const tourRef = useRef(null);
  const hasStartedRef = useRef(false);

  const launchTour = useCallback(() => {
    if (!enabled) return;

    const availableSteps = steps.filter((step) => document.querySelector(step.element));
    if (availableSteps.length === 0) return;

    tourRef.current?.destroy();
    tourRef.current = driver({
      animate: true,
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 10,
      showButtons: ['next', 'close'],
      nextBtnText: 'Next',
      doneBtnText: 'Done',
      closeBtnText: 'Skip',
      popoverClass: 'kisansetu-tour-popover',
      steps: availableSteps,
      onDestroyed: () => {
        localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      },
    });

    tourRef.current.drive();
  }, [enabled, steps]);

  const startTour = useCallback(() => {
    window.setTimeout(launchTour, 250);
  }, [launchTour]);

  const restartTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    startTour();
  }, [startTour]);

  useEffect(() => {
    if (!autoStart || !enabled || hasStartedRef.current || localStorage.getItem(TOUR_COMPLETED_KEY)) {
      return undefined;
    }

    hasStartedRef.current = true;
    const timer = window.setTimeout(launchTour, 650);

    return () => window.clearTimeout(timer);
  }, [autoStart, enabled, launchTour]);

  useEffect(() => () => {
    tourRef.current?.destroy();
  }, []);

  return { startTour, restartTour };
}
