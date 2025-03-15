interface ShapeProps {
  type: 'circle' | 'square' | 'triangle' | 'diamond';
  isActive?: boolean;
}

export function Shape({ type, isActive = false }: ShapeProps) {
  const size = 60;
  const strokeColor = isActive ? 'var(--outline-active)' : 'var(--outline)';
  const fillColor = isActive ? 'var(--shape-fill-active)' : 'var(--shape-fill)';

  switch (type) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="25" stroke={strokeColor} strokeWidth="4" fill={fillColor} />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60">
          <rect x="10" y="10" width="40" height="40" stroke={strokeColor} strokeWidth="4" fill={fillColor} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60">
          <path d="M30 10 L50 45 L10 45 Z" stroke={strokeColor} strokeWidth="4" fill={fillColor} />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60">
          <path d="M30 10 L50 30 L30 50 L10 30 Z" stroke={strokeColor} strokeWidth="4" fill={fillColor} />
        </svg>
      );
  }
} 