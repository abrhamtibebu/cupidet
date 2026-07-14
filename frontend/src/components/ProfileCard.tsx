import { useEffect, useState } from 'react'
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
import { IconLike, IconPass, IconReport, IconRewind, IconSuperLike } from './Icons'

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

  useEffect(() => {
    // Soft rise from the peeked next-card scale — no heavy remount bounce
    void controls.start({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    })
  }, [controls])

  // Prefetch remaining photos
  useEffect(() => {
    photos.slice(1, 3).forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [photos])

  const goal = goalLabel(card.relationship_goal)

  const nextPhoto = () => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))
  const prevPhoto = () => setPhotoIndex((i) => Math.max(0, i - 1))

  const detailChips = [
    card.occupation,
    card.height_cm ? `${card.height_cm} cm` : null,
    ...(card.languages?.slice(0, 2) || []),
  ].filter(Boolean) as string[]

  const promptPreview = card.prompts?.slice(0, 2) || []

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
        className="relative z-10 h-[64dvh] w-full touch-none overflow-hidden rounded-[28px] bg-panel will-change-transform [transform:translateZ(0)]"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <button type="button" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={prevPhoto} aria-label="Previous photo" />
        <button type="button" className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={nextPhoto} aria-label="Next photo" />

        <motion.div
          style={{
            opacity: forcedBadge === 'like' ? 1 : likeOpacity,
            scale: forcedBadge === 'like' ? 1.06 : likeScale,
          }}
          className="pointer-events-none absolute left-5 top-16 z-20 origin-left rounded-xl border-[3px] border-lime bg-black/25 px-3.5 py-1.5 text-base font-black uppercase tracking-[0.18em] text-lime backdrop-blur-sm"
        >
          Like
        </motion.div>
        <motion.div
          style={{
            opacity: forcedBadge === 'pass' ? 1 : passOpacity,
            scale: forcedBadge === 'pass' ? 1.06 : passScale,
          }}
          className="pointer-events-none absolute right-5 top-16 z-20 origin-right rounded-xl border-[3px] border-white bg-black/25 px-3.5 py-1.5 text-base font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm"
        >
          Pass
        </motion.div>

        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">{goal}</span>
          {card.is_online && (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-lime backdrop-blur">
              Online
            </span>
          )}
        </div>
        <span className="absolute right-4 top-4 z-20 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {typeof card.distance_km === 'number' ? `${card.distance_km} km` : card.location || 'Nearby'}
        </span>

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

        <div className="absolute inset-x-0 bottom-0 z-20 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {card.name}
              {card.age ? <span className="font-semibold text-white/85">, {card.age}</span> : null}
            </h2>
            {card.verified ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#3b82f6] text-[10px] font-bold">✓</span>
            ) : null}
          </div>
          {card.location && <p className="mt-1 text-sm text-white/70">{card.location}</p>}
          {card.bio && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">{card.bio}</p>}
          {detailChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detailChips.map((chip) => (
                <span key={chip} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/85">
                  {chip}
                </span>
              ))}
            </div>
          )}
          {promptPreview.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {promptPreview.map((p) => (
                <div key={p.prompt_key} className="rounded-2xl bg-black/35 px-3 py-2 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-lime/90">
                    {p.label || p.prompt_key}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/90">{p.answer}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {card.interests?.slice(0, 4).map((interest) => (
              <span key={interest} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/90">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </motion.article>

      <div className="relative z-10 mt-5 flex items-center justify-center gap-4">
        <button type="button" disabled={busy} onClick={onReport} className="action-circle" aria-label="Report">
          <IconReport size={22} className="text-lime" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void flyOut('pass')}
          className="action-circle action-circle-pass"
          aria-label="Pass"
        >
          <IconPass size={22} />
        </button>
        <button
          type="button"
          onClick={onRewind}
          disabled={!canRewind || busy}
          className="action-circle disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Rewind"
        >
          <IconRewind size={22} className="text-amber-300" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSuperLike}
          className="action-circle action-circle-super"
          aria-label="Super like"
        >
          <IconSuperLike size={22} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void flyOut('like')}
          className="action-circle action-circle-like"
          aria-label="Like"
        >
          <IconLike size={22} />
        </button>
      </div>
    </div>
  )
}
