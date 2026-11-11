import { useEffect, useState } from 'react';
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { todayISO } from './model/logic';

export const NARROW = '(max-width: 760px)';

export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/** Today's date, refreshed when the tab regains focus so an app left open overnight rolls over. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const on = () => setToday(todayISO());
    window.addEventListener('focus', on);
    document.addEventListener('visibilitychange', on);
    return () => { window.removeEventListener('focus', on); document.removeEventListener('visibilitychange', on); };
  }, []);
  return today;
}

/** A short drag threshold keeps a click a click; the touch delay keeps a swipe a scroll. */
export function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );
}
