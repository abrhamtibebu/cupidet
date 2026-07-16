import { useEffect, useState, type ReactNode } from 'react'
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion'
import type { DiscoverCard } from '../types'
import { resolveMediaUrl } from '../lib/media'
import { goalLabel } from '../lib/profileOptions'
import {
  IconChef,
  IconCoffee,
  IconHeight,
  IconLanguages,
  IconLike,
  IconMusic,
  IconPass,
  IconReport,
  IconRewind,
  IconSpark,
  IconSuperLike,
  IconVerified,
} from './Icons'

type ExitDir = 'like' | 'pass' | null

type Props = {
  card: DiscoverCard
  onLike: () => void
  onPass: () => void
  onSuperLike?: () => void
  onRewind?: () => void
  canRewind?: boolean
  onReport?: () => void
}

function interestIcon(label: string): ReactNode {
  const key = label.toLowerCase()
  if (key.includes('coffee') || key.includes('tea')) return <IconCoffee size={12} />
  if (key.includes('danc') || key.includes('music')) return <IconMusic size={12} />
  if (key.includes('cook') || key.includes('food') || key.includes('chef')) return <IconChef size={12} />
  return <IconSpark size={12} />
}

export function ProfileCard({ card, onLike, onPass, onSuperLike, onRewind, canRewind = false, onReport }: Props) {
  const photos = card.photos?.length
    ? card.photos.map((p) => resolveMediaUrl(p.image_url))
    : [resolveMediaUrl(card.photo_url, 'https://i.pravatar.cc/800?u=fallback')]
  const [photoIndex, setPhotoIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [forcedBadge, setForcedBadge] = useState<ExitDir>(null)
  const controls = useAnimation()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-260, 0, 260], [-14, 0, 14])
  const likeOpacity = useTransform(x, [8, 70], [0, 1])
  const passOpacity = useTransform(x, [-70, -8], [1, 0])
  const likeScale = useTransform(x, [8, 100], [0.92, 1.06])
  const passScale = useTransform(x, [-100, -8], [1.06, 0.92])
  const likeOverlayOpacity = useTransform(x, [12, 130], [0, 0.28])
  const passOverlayOpacity = useTransform(x, [-130, -12], [0.28, 0])
  const likeBorderOpacity = useTransform(x, [16, 120], [0, 0.9])
  const passBorderOpacity = useTransform(x, [-120, -16], [0.9, 0])

  useEffect(() => {
    void controls.start({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    })
  }, [controls])

  useEffect(() => {
    photos.slice(1, 3).forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [photos])

  const goal = goalLabel(card.relationship_goal).toUpperCase()
  const locationLabel = card.location?.trim() || 'Nearby'
  const distanceLabel =
    typeof card.distance_km === 'number'
      ? card.distance_km < 1
        ? 'Less than 1km away'
        : `${Math.round(card.distance_km)}km away`
      : null
  const subtitle = [card.occupation, distanceLabel].filter(Boolean).join(' · ')
  const languages = (card.languages || []).slice(0, 2).join(', ')
  const interests = (card.interests || []).slice(0, 3)

  const nextPhoto = () => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))
  const prevPhoto = () => setPhotoIndex((i) => Math.max(0, i - 1))

  const flyOut = async (dir: 'like' | 'pass') => {
    if (busy) return
    setBusy(true)
    setForcedBadge(dir)
    await controls.start({
      x: dir === 'like' ? 520 : -520,
      rotate: dir === 'like' ? 18 : -18,
      opacity: 0,
      transition: { type: 'tween', duration: 0.22, ease: [0.33, 1, 0.68, 1] },
    })
    if (dir === 'like') onLike()
    else onPass()
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (busy) return
    const goLike = info.offset.x > 90 || info.velocity.x > 600
    const goPass = info.offset.x < -90 || info.velocity.x < -600
    if (goLike) void flyOut('like')
    else if (goPass) void flyOut('pass')
    else {
      setForcedBadge(null)
      void controls.start({
        x: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 480, damping: 32, mass: 0.7 },
      })
    }
  }

  return (
    <div className="relative">
      <motion.article
        className="discover-card relative z-10 touch-none will-change-transform [transform:translateZ(0)]"
        style={{ x, rotate }}
        drag={busy ? false : 'x'}
        dragElastic={0.14}
        dragConstraints={{ left: 0, right: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ opacity: 1, scale: 0.96, y: 8 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
      >
        <img
          src={photos[photoIndex]}
          alt={card.name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-emerald-400 mix-blend-screen"
          style={{ opacity: forcedBadge === 'like' ? 0.28 : likeOverlayOpacity }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-rose-500 mix-blend-screen"
          style={{ opacity: forcedBadge === 'pass' ? 0.24 : passOverlayOpacity }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[1.75rem] border-[3px] border-emerald-300 shadow-[inset_0_0_40px_rgba(52,211,153,0.22)]"
          style={{ opacity: forcedBadge === 'like' ? 1 : likeBorderOpacity }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[1.75rem] border-[3px] border-rose-400 shadow-[inset_0_0_40px_rgba(244,63,94,0.2)]"
          style={{ opacity: forcedBadge === 'pass' ? 1 : passBorderOpacity }}
        />

        <button type="button" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={prevPhoto} aria-label="Previous photo" />
        <button type="button" className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={nextPhoto} aria-label="Next photo" />

        <motion.div
          style={{
            opacity: forcedBadge === 'like' ? 1 : likeOpacity,
            scale: forcedBadge === 'like' ? 1.06 : likeScale,
          }}
          className="pointer-events-none absolute left-5 top-16 z-20 origin-left rounded-xl border-[3px] border-emerald-300 bg-emerald-950/35 px-3.5 py-1.5 text-base font-black uppercase tracking-[0.18em] text-emerald-200 backdrop-blur-sm"
        >
          Like
        </motion.div>
        <motion.div
          style={{
            opacity: forcedBadge === 'pass' ? 1 : passOpacity,
            scale: forcedBadge === 'pass' ? 1.06 : passScale,
          }}
          className="pointer-events-none absolute right-5 top-16 z-20 origin-right rounded-xl border-[3px] border-rose-400 bg-rose-950/35 px-3.5 py-1.5 text-base font-black uppercase tracking-[0.18em] text-rose-100 backdrop-blur-sm"
        >
          Pass
        </motion.div>

        {photos.length > 1 && (
          <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-5 bg-lime' : 'w-3 bg-white/35'}`}
              />
            ))}
          </div>
        )}

        <div className="absolute left-4 top-4 z-20">
          <span className="rounded-full bg-lime px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">
            {goal}
          </span>
        </div>
        <span className="absolute right-4 top-4 z-20 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          {locationLabel}
        </span>

        <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-[5.75rem] pt-24">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="discover-card-name">
              {card.name}
              {card.age ? `, ${card.age}` : ''}
            </h2>
            {card.verified ? (
              <span className="grid h-[1.35rem] w-[1.35rem] place-items-center rounded-full bg-[#3b82f6] text-white shadow-[0_0_0_2px_rgba(59,130,246,0.25)]">
                <IconVerified size={11} strokeWidth={2.6} />
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="mt-1.5 text-sm font-medium text-white/78">{subtitle}</p> : null}

          <div className="mt-3.5 flex flex-wrap gap-2">
            {card.height_cm ? (
              <span className="discover-attr">
                <IconHeight size={12} />
                {card.height_cm} cm
              </span>
            ) : null}
            {languages ? (
              <span className="discover-attr">
                <IconLanguages size={12} />
                {languages}
              </span>
            ) : null}
            {interests.map((interest) => (
              <span key={interest} className="discover-attr">
                {interestIcon(interest)}
                {interest}
              </span>
            ))}
          </div>
        </div>

        <div className="discover-actions">
          <button type="button" disabled={busy} onClick={onReport} className="discover-action" aria-label="Report">
            <IconReport size={17} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void flyOut('pass')}
            className="discover-action"
            aria-label="Pass"
          >
            <IconPass size={17} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void flyOut('like')}
            className="discover-action discover-action-like"
            aria-label="Like"
          >
            <IconLike size={24} />
          </button>
          <button
            type="button"
            onClick={onRewind}
            disabled={!canRewind || busy}
            className="discover-action"
            aria-label="Rewind"
          >
            <IconRewind size={17} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSuperLike}
            className="discover-action"
            aria-label="Super like"
          >
            <IconSuperLike size={17} />
          </button>
        </div>
      </motion.article>
    </div>
  )
}
