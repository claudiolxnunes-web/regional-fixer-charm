import { useState, useEffect } from 'react';
import { TransitionType } from '@/components/PageTransition';

export function useTransitionSettings() {
  const [type, setType] = useState<TransitionType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('page-transition-type') as TransitionType) || 'fade';
    }
    return 'fade';
  });

  const [duration, setDuration] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('page-transition-duration');
      return saved ? parseFloat(saved) : 0.3;
    }
    return 0.3;
  });

  useEffect(() => {
    localStorage.setItem('page-transition-type', type);
  }, [type]);

  useEffect(() => {
    localStorage.setItem('page-transition-duration', duration.toString());
  }, [duration]);

  return { type, setType, duration, setDuration };
}
