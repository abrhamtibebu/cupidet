import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number
}

function base({ size = 20, className, strokeWidth = 1.6, ...rest }: IconProps) {
  return {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    className,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    ...rest,
  }
}

/** Soft classic heart path — used filled or stroked */
const HEART_D =
  'M12 21s-7.6-4.55-9.4-8.85C1.4 8.9 3.55 6.2 6.7 6.2c1.9 0 3.35 1.05 4.2 2.45.85-1.4 2.3-2.45 4.2-2.45 3.15 0 5.3 2.7 4.1 5.95C19.6 16.45 12 21 12 21Z'

/** Explore / swipe deck — modern compass */
export function IconDiscover(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.65, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.9 9.1-1.55 5.15L8.2 15.8l1.55-5.15L14.9 9.1Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** People who liked you — elegant filled heart */
export function IconLikes(props: IconProps) {
  const { size = 22, className, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden
      {...rest}
    >
      <path d={HEART_D} />
    </svg>
  )
}

/** Conversations — soft chat bubble */
export function IconMessages(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.65, ...props })}>
      <path d="M7.5 18.8 4.6 20l.9-3A7.5 7.5 0 1 1 12 19.5c-1.7 0-3.25-.5-4.5-1.35Z" />
      <path d="M8.8 11h6.4M8.8 14h3.8" opacity="0.8" />
    </svg>
  )
}

/** Your profile */
export function IconProfile(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.65, ...props })}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.25a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

/** Discovery filters — stacked sliders */
export function IconFilters(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
      <circle cx="8.5" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Settings gear */
export function IconSettings(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.55, ...props })}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.5l1.6 1.6M17.6 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.5l1.6-1.6M17.6 8l1.6-1.6" />
    </svg>
  )
}

/** Pass / dismiss — refined X */
export function IconPass(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  )
}

/** Like action — soft rose heart */
export function IconLike(props: IconProps) {
  const { size = 22, className, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden
      {...rest}
    >
      <path d={HEART_D} />
    </svg>
  )
}

/** Outlined heart (for light accents) */
export function IconHeartOutline(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.65, ...props })}>
      <path d={HEART_D} />
    </svg>
  )
}

/** Super like — refined 4-point sparkle */
export function IconSuperLike(props: IconProps) {
  const { size = 22, className, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden
      {...rest}
    >
      <path d="M12 2.8c.35 3.4 1.85 5.3 4.9 6.2-3.05.9-4.55 2.8-4.9 6.2-.35-3.4-1.85-5.3-4.9-6.2 3.05-.9 4.55-2.8 4.9-6.2Z" />
      <path d="M18.2 4.4c.18 1.4.8 2.2 2.1 2.6-1.3.4-1.92 1.2-2.1 2.6-.18-1.4-.8-2.2-2.1-2.6 1.3-.4 1.92-1.2 2.1-2.6Z" opacity="0.9" />
    </svg>
  )
}

/** Rewind last swipe — curved undo */
export function IconRewind(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.75, ...props })}>
      <path d="M8.2 8.2 5 11.4l3.2 3.2" />
      <path d="M5 11.4h8.2a4.8 4.8 0 1 1 0 9.6H9.5" />
    </svg>
  )
}

/** Report — elegant flag */
export function IconReport(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M6 21V4.5" />
      <path d="M6 5.2h9.2a.8.8 0 0 1 .65 1.25L14.2 9.8l1.65 3.35a.8.8 0 0 1-.65 1.25H6" />
    </svg>
  )
}

/** Back chevron */
export function IconBack(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.85, ...props })}>
      <path d="m15 5.5-7 6.5 7 6.5" />
    </svg>
  )
}
