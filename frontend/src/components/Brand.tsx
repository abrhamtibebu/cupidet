import { MingleLogo } from './MingleLogo'

export type BrandSize = 'sm' | 'md' | 'lg' | 'hero' | 'splash'

const logoSize: Record<BrandSize, string> = {
  sm: 'h-7 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-14 w-auto',
  hero: 'h-20 w-auto',
  splash: 'h-28 w-auto sm:h-36',
}

const markSize: Record<BrandSize, string> = {
  sm: 'h-8 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-14 w-auto',
  hero: 'h-20 w-auto',
  splash: 'h-24 w-auto sm:h-28',
}

export const BRAND_NAME = 'Mingle 251'

/** Pink heart mark from the wordmark. */
export function BrandIcon({
  size = 'md',
  className = '',
  animated = false,
}: {
  size?: BrandSize
  className?: string
  animated?: boolean
}) {
  return (
    <MingleLogo
      markOnly
      animated={animated}
      className={`${markSize[size]} ${className}`}
    />
  )
}

/** Full Mingle 251 wordmark SVG. */
export function BrandLogo({
  size = 'md',
  className = '',
  animated = false,
}: {
  size?: BrandSize
  className?: string
  animated?: boolean
}) {
  return (
    <MingleLogo
      animated={animated}
      className={`${logoSize[size]} ${className}`}
    />
  )
}
