import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';
import { swipeDirection, type SwipeDirection } from '../utils/swipe.ts';

interface Options {
  axis?: 'horizontal' | 'vertical';
  disabled?: boolean;
  onSwipe: (direction: SwipeDirection) => void;
}

export function useSwipeGesture({ axis = 'horizontal', disabled = false, onSwipe }: Options) {
  const [offset, setOffset] = useState(0);
  const active = useRef<{ id: number; x: number; y: number; dx: number; dy: number; element: HTMLElement } | null>(null);
  const suppressClickUntil = useRef(0);
  const options = useRef({ disabled, onSwipe });
  options.current = { disabled, onSwipe };
  const reset = () => {
    const previous = active.current;
    active.current = null;
    setOffset(0);
    if (previous?.element.hasPointerCapture(previous.id)) previous.element.releasePointerCapture(previous.id);
  };
  useEffect(() => {
    window.addEventListener('blur', reset);
    return () => { window.removeEventListener('blur', reset); reset(); };
  }, []);
  useEffect(() => { if (disabled) reset(); }, [disabled]);

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (active.current) { reset(); return; }
      if (options.current.disabled || event.pointerType !== 'touch' || !event.isPrimary || !window.matchMedia('(max-width: 767px)').matches) return;
      const target = event.target as HTMLElement;
      if (target.closest('button, input, textarea, select, a, [contenteditable="true"], [role="slider"], [data-no-swipe]')) return;
      const surface = target.closest('[data-swipe-surface]');
      if (surface && surface !== event.currentTarget) return;
      // Let horizontal carousels and date strips keep their native scrolling.
      for (let element: HTMLElement | null = target; element && element !== event.currentTarget; element = element.parentElement) {
        if (element.scrollWidth > element.clientWidth && /auto|scroll/.test(getComputedStyle(element).overflowX)) return;
      }
      active.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, element: event.currentTarget };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const gesture = active.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      gesture.dx = event.clientX - gesture.x;
      gesture.dy = event.clientY - gesture.y;
      const primary = axis === 'horizontal' ? gesture.dx : gesture.dy;
      const cross = axis === 'horizontal' ? gesture.dy : gesture.dx;
      if (Math.abs(cross) > 12 && Math.abs(cross) > Math.abs(primary)) { reset(); return; }
      if (Math.abs(primary) > 12 && Math.abs(primary) > Math.abs(cross) * 1.4) {
        setOffset(Math.max(-56, Math.min(56, primary * 0.4)));
      }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const gesture = active.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      const direction = swipeDirection(event.clientX - gesture.x, event.clientY - gesture.y, axis);
      const moved = Math.abs(gesture.dx) > 12 || Math.abs(gesture.dy) > 12;
      reset();
      if (moved) suppressClickUntil.current = Date.now() + 500;
      if (direction && !options.current.disabled) options.current.onSwipe(direction);
    },
    onPointerCancel: reset,
    onLostPointerCapture: reset,
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (Date.now() < suppressClickUntil.current && !(event.target as HTMLElement).closest('button, a')) { event.preventDefault(); event.stopPropagation(); }
    },
  };
  return { handlers, offset };
}
