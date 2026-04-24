import { useState, useEffect, useCallback, useRef } from 'react';

export function useCountdown(durationMinutes: number) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [isExpired, setIsExpired] = useState(false);
  const initialized = useRef(false);

  // Re-initialize when durationMinutes changes from 0 to a real value
  useEffect(() => {
    if (durationMinutes > 0 && !initialized.current) {
      initialized.current = true;
      setSecondsLeft(durationMinutes * 60);
      setIsExpired(false);
    }
  }, [durationMinutes]);

  useEffect(() => {
    if (isExpired || durationMinutes <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, durationMinutes]);

  const getTimerColor = useCallback((): 'success' | 'warning' | 'error' => {
    const minutes = secondsLeft / 60;
    if (minutes > 10) return 'success';
    if (minutes > 5) return 'warning';
    return 'error';
  }, [secondsLeft]);

  return { secondsLeft, isExpired, getTimerColor };
}
