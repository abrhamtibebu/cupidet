import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  Check,
  ChefHat,
  ChevronLeft,
  Coffee,
  Eye,
  EyeOff,
  Flag,
  Globe,
  Heart,
  MessageCircle,
  Music,
  RotateCcw,
  Ruler,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react'

type IconProps = LucideProps

// Thin, elegant defaults shared by every icon in the app.
function wrap(Icon: LucideIcon, defaults?: Partial<LucideProps>) {
  return function WrappedIcon({ size = 20, strokeWidth = 1.8, ...rest }: IconProps) {
    return <Icon aria-hidden size={size} strokeWidth={strokeWidth} {...defaults} {...rest} />
  }
}

/** Explore — magnifying glass */
export const IconDiscover = wrap(Search)

/** People who liked you — outlined heart */
export const IconLikes = wrap(Heart)

/** Conversations — chat bubble */
export const IconMessages = wrap(MessageCircle)

/** Your profile */
export const IconProfile = wrap(UserRound)

/** Discovery filters — sliders */
export const IconFilters = wrap(SlidersHorizontal)

/** Settings gear */
export const IconSettings = wrap(Settings)

/** Pass / dismiss — X */
export const IconPass = wrap(X, { strokeWidth: 2.1 })

/** Like action — filled heart */
export function IconLike({ size = 22, strokeWidth = 1.8, ...rest }: IconProps) {
  return <Heart aria-hidden size={size} strokeWidth={strokeWidth} fill="currentColor" {...rest} />
}

/** Outlined heart (for light accents) */
export const IconHeartOutline = wrap(Heart)

/** Super like — outlined star */
export const IconSuperLike = wrap(Star)

/** Rewind — counter-clockwise arrow */
export const IconRewind = wrap(RotateCcw)

/** Report — flag */
export const IconReport = wrap(Flag)

/** Verified check */
export const IconVerified = wrap(Check, { strokeWidth: 2.4 })

/** Back chevron */
export const IconBack = wrap(ChevronLeft, { strokeWidth: 2 })

/** Attribute: height */
export const IconHeight = wrap(Ruler)

/** Attribute: languages */
export const IconLanguages = wrap(Globe)

/** Attribute: coffee */
export const IconCoffee = wrap(Coffee)

/** Attribute: music / dancing */
export const IconMusic = wrap(Music)

/** Attribute: cooking */
export const IconChef = wrap(ChefHat)

/** Attribute: generic interest */
export const IconSpark = wrap(Sparkles)

/** Password visibility — show */
export const IconEye = wrap(Eye)

/** Password visibility — hide */
export const IconEyeOff = wrap(EyeOff)
