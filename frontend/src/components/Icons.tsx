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
  'M12 20.5s-6.8-4.1-8.6-7.9C2.1 9.4 3.9 6.8 6.7 6.8c1.7 0 3 1 3.9 2.3.9-1.3 2.2-2.3 3.9-2.3 2.8 0 4.6 2.6 3.3 5.8C18.8 16.4 12 20.5 12 20.5Z'

/** Explore — magnifying glass (matches design) */
export function IconDiscover(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.85, ...props })}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  )
}

/** People who liked you — outlined heart in nav, can fill via class */
export function IconLikes(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.75, ...props })}>
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

/** Discovery filters — three sliders (matches design) */
export function IconFilters(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.8, ...props })}>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.15" fill="#0b0b0b" />
      <circle cx="9" cy="7" r="2.15" />
      <circle cx="15" cy="12" r="2.15" fill="#0b0b0b" />
      <circle cx="15" cy="12" r="2.15" />
      <circle cx="11" cy="17" r="2.15" fill="#0b0b0b" />
      <circle cx="11" cy="17" r="2.15" />
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

/** Pass / dismiss — thin X */
export function IconPass(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.1, ...props })}>
      <path d="M7.5 7.5 16.5 16.5M16.5 7.5 7.5 16.5" />
    </svg>
  )
}

/** Like action — filled heart */
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

/** Super like — outlined star (matches design) */
export function IconSuperLike(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="m12 3.6 2.2 5.55h5.85l-4.75 3.4 1.85 5.65L12 15.5l-5.15 2.7 1.85-5.65-4.75-3.4h5.85L12 3.6Z" />
    </svg>
  )
}

/** Rewind — counter-clockwise curved arrow with endpoint */
export function IconRewind(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.85, ...props })}>
      <path d="M8.4 7.6A6.4 6.4 0 1 0 18 12.2" />
      <path d="M8.4 7.6 8.2 3.8M8.4 7.6l3.7-.9" />
      <circle cx="18" cy="12.2" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Report — simple flag */
export function IconReport(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.75, ...props })}>
      <path d="M6.5 20.5V4.5" />
      <path d="M6.5 5h9.4l-1.7 3.2 1.7 3.2H6.5" />
    </svg>
  )
}

/** Verified check */
export function IconVerified(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.2, ...props })}>
      <path d="m7.2 12.2 3 3 6.6-6.6" />
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

/** Attribute: height */
export function IconHeight(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M8 5h8v14H8z" />
      <path d="M8 8h3M8 12h4M8 16h3" />
    </svg>
  )
}

/** Attribute: languages */
export function IconLanguages(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M3.8 12h16.4M12 3.8c2.3 2.5 3.5 5.3 3.5 8.2S14.3 17.7 12 20.2M12 3.8C9.7 6.3 8.5 9.1 8.5 12s1.2 5.7 3.5 8.2" />
    </svg>
  )
}

/** Attribute: coffee */
export function IconCoffee(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M5.5 9.5h10.5v5A3.8 3.8 0 0 1 12.2 18.3H9.3A3.8 3.8 0 0 1 5.5 14.5v-5Z" />
      <path d="M16 11h1.4A2 2 0 0 1 19.4 13v0A2 2 0 0 1 17.4 15H16" />
      <path d="M8.2 6.2c.35.55.35 1.15 0 1.7M11 6.2c.35.55.35 1.15 0 1.7" />
    </svg>
  )
}

/** Attribute: music / dancing */
export function IconMusic(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M10.2 17.2V6.5l8.3-1.5v11" />
      <circle cx="7.9" cy="17.2" r="2.3" />
      <circle cx="16.2" cy="16" r="2.3" />
    </svg>
  )
}

/** Attribute: cooking */
export function IconChef(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M8.2 10.2c0-2.2 1.5-3.7 3.8-3.7s3.8 1.5 3.8 3.7" />
      <path d="M6.8 10.5h10.4v1.8a5.2 5.2 0 0 1-5.2 5.2h0a5.2 5.2 0 0 1-5.2-5.2v-1.8Z" />
      <path d="M12 17.5V20" />
    </svg>
  )
}

/** Attribute: generic interest */
export function IconSpark(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.7, ...props })}>
      <path d="M12 4.5v3.2M12 16.3v3.2M4.5 12h3.2M16.3 12h3.2M7.1 7.1l2.2 2.2M14.7 14.7l2.2 2.2M16.9 7.1l-2.2 2.2M9.3 14.7l-2.2 2.2" />
    </svg>
  )
}
