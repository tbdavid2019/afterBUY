export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export function swipeDirection(dx: number, dy: number, axis: 'horizontal' | 'vertical', threshold = 72): SwipeDirection | null {
  const primary = axis === 'horizontal' ? dx : dy;
  const cross = axis === 'horizontal' ? dy : dx;
  if (Math.abs(primary) < threshold || Math.abs(primary) < Math.abs(cross) * 1.4) return null;
  return axis === 'horizontal' ? (primary > 0 ? 'right' : 'left') : (primary > 0 ? 'down' : 'up');
}
