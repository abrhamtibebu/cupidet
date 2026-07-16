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
  'M12 20.4S3.8 15.2 3.2 9.6C2.7 6.4 5 4.2 7.9 4.2c1.8 0 3.2 1 4.1 2.4 0.9-1.4 2.3-2.4 4.1-2.4 2.9 0 5.2 2.2 4.7 5.4C20.2 15.2 12 20.4 12 20.4Z'

/** Explore / swipe deck */
export function IconDiscover(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m15.35 8.55-2 5.65-5.65 2 2-5.65 5.65-2Z" />
      <circle cx="12" cy="12" r="0.95" fill="currentColor" stroke="none" />
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

/** Conversations */
export function IconMessages(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.2 19.2 4.2 20.5l1-3.2A7.6 7.6 0 1 1 12 19.6a7.3 7.3 0 0 1-4.8-.4Z" />
      <path d="M8.6 10.8h6.8M8.6 13.8h4.2" opacity="0.85" />
    </svg>
  )
}

/** Your profile */
export function IconProfile(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.2" r="3.1" />
      <path d="M5.8 19.2a6.2 6.2 0 0 1 12.4 0" />
    </svg>
  )
}

/** Discovery filters */
export function IconFilters(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 7h15" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
      <circle cx="9" cy="7" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.45" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Settings gear */
export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2.85" />
      <path d="M12 4v1.9M12 18.1V20M5.4 6.5l1.35 1.35M17.25 16.15l1.35 1.35M4 12h1.9M18.1 12H20M5.4 17.5l1.35-1.35M17.25 7.85l1.35-1.35" />
    </svg>
  )
}

/** Pass / dismiss */
export function IconPass(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.15, ...props })}>
      <path d="M7.8 7.8 16.2 16.2M16.2 7.8 7.8 16.2" />
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
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d={HEART_D} />
    </svg>
  )
}

/** Super like — refined star */
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
      <path d="m12 3.6 2.05 5.9h6.2l-5 3.55 1.95 5.95L12 15.7l-5.2 3.3 1.95-5.95-5-3.55h6.2L12 3.6Z" />
    </svg>
  )
}

/** Rewind last swipe */
export function IconRewind(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.85, ...props })}>
      <path d="M5.2 12a6.8 6.8 0 1 0 2-4.85" />
      <path d="M4.8 5.2v3.5H8.3" />
    </svg>
  )
}

/** Report / flag */
export function IconReport(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.2 20.5V4.8" />
      <path d="M6.2 5.4h8.8l-1.45 2.9 1.45 2.9H6.2" />
    </svg>
  )
}

/** Back chevron */
export function IconBack(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.9, ...props })}>
      <path d="m14.8 5.5-7 6.5 7 6.5" />
    </svg>
  )
}
