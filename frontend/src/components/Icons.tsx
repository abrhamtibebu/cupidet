import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number
}

function base({ size = 20, className, strokeWidth = 1.75, ...rest }: IconProps) {
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

/** Explore / swipe deck — compass, not a heart */
export function IconDiscover(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 5.9-5.9 2.1 2.1-5.9 5.9-2.1Z" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** People who liked you */
export function IconLikes(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20.2S4.5 15.4 3.2 10.8C2.3 7.6 4.4 5 7.4 5c1.7 0 3.1.9 3.8 2.1C12.9 5.9 14.3 5 16 5c3 0 5.1 2.6 4.2 5.8C19.5 15.4 12 20.2 12 20.2Z" />
    </svg>
  )
}

/** Conversations */
export function IconMessages(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 19.5 4 21l1.2-3.5A8 8 0 1 1 12 20a7.7 7.7 0 0 1-4.5-.5Z" />
      <path d="M8.5 11h7M8.5 14h4.5" />
    </svg>
  )
}

/** Your profile */
export function IconProfile(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
      <circle cx="12" cy="12" r="9" opacity="0.35" />
    </svg>
  )
}

/** Discovery filters */
export function IconFilters(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
      <circle cx="9" cy="7" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Settings gear */
export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.5M17.5 16.1l1.6 1.5M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.5M17.5 7.9l1.6-1.5" />
      <circle cx="12" cy="12" r="8.5" opacity="0.35" />
    </svg>
  )
}

/** Pass / dismiss — Hinge-style X */
export function IconPass(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.4, ...props })}>
      <path d="M7.5 7.5 16.5 16.5M16.5 7.5 7.5 16.5" />
    </svg>
  )
}

/** Like action — Hinge-style heart */
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
      <path d="M12 20.25c-.35 0-7.35-4.55-8.7-8.95C2.45 8.15 4.35 5.7 7.2 5.7c1.55 0 2.85.85 3.55 2.05.15.25.4.4.7.4s.55-.15.7-.4c.7-1.2 2-2.05 3.55-2.05 2.85 0 4.75 2.45 3.9 5.6-1.35 4.4-8.35 8.95-8.7 8.95Z" />
    </svg>
  )
}

/** Super like — Hinge-style star */
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
      <path d="m12 3.8 1.85 5.55h5.85l-4.75 3.4 1.85 5.55L12 15.15l-4.8 3.15 1.85-5.55-4.75-3.4h5.85L12 3.8Z" />
    </svg>
  )
}

/** Rewind last swipe */
export function IconRewind(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <path d="M5 12a7 7 0 1 0 2.1-5" />
      <path d="M4.5 5v3.8H8.3" />
    </svg>
  )
}

/** Report / flag */
export function IconReport(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 21V4.5" />
      <path d="M6 5.2h9.2l-1.6 3.2 1.6 3.2H6" />
    </svg>
  )
}

/** Back chevron */
export function IconBack(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  )
}
