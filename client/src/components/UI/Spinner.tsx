const SIZES = { sm: 16, md: 24, lg: 48 } as const

interface SpinnerProps {
  size?: keyof typeof SIZES
  color?: string
  className?: string
}

export function Spinner({ size = 'md', color = 'currentColor', className }: SpinnerProps) {
  const s = SIZES[size]
  const strokeWidth = size === 'lg' ? 2 : 2.5

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className={`spinner-icon${className ? ` ${className}` : ''}`}
      aria-label="Loading"
      role="status"
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="22 38"
        opacity="0.9"
      />
    </svg>
  )
}
