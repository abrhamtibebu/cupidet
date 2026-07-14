type Size = 'sm' | 'md' | 'lg' | 'hero'

const iconSize: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  hero: 'h-24 w-24',
}

const logoSize: Record<Size, string> = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  hero: 'h-28',
}

export const BRAND_NAME = 'Mingle 251'

/** Compact mark for loading screens, nav chips, and favicons. */
export function BrandIcon({
  size = 'md',
  className = '',
}: {
  size?: Size
  className?: string
}) {
  return (
    <img
      src="/mingle_251_icon.png"
      alt={BRAND_NAME}
      className={`${iconSize[size]} object-contain ${className}`}
      draggable={false}
    />
  )
}

/** Primary wordmark / full logo. */
export function BrandLogo({
  size = 'md',
  className = '',
}: {
  size?: Size
  className?: string
}) {
  return (
    <img
      src="/mingle_251_logo.png"
      alt={BRAND_NAME}
      className={`${logoSize[size]} w-auto max-w-full object-contain ${className}`}
      draggable={false}
    />
  )
}
