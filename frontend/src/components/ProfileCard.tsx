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

  const goal = goalLabel(card.relationship_goal)
  const nextPhoto = () => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))
  const prevPhoto = () => setPhotoIndex((i) => Math.max(0, i - 1))
  const detailChips = [
    card.occupation,
    card.height_cm ? `${card.height_cm} cm` : null,
    card.education,
    ...(card.languages?.slice(0, 2) || []),
  ].filter(Boolean) as string[]
  const prompt = card.prompts?.[0]
  const meta = [
    card.location,
    typeof card.distance_km === 'number' ? `${card.distance_km} km away` : null,
    card.is_online ? 'Online now' : null,
  ].filter(Boolean)

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
        className="relative z-10 h-[68dvh] min-h-[560px] w-full touch-none overflow-hidden rounded-[34px] border border-white/10 bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.55)] will-change-transform [transform:translateZ(0)]"
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.10),transparent_32%),linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.55)_34%,rgba(0,0,0,0.10)_66%,rgba(0,0,0,0.30)_100%)]" />

        <button type="button" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={prevPhoto} aria-label="Previous photo" />
        <button type="button" className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={nextPhoto} aria-label="Next photo" />

        <motion.div
          style={{ opacity: forcedBadge === 'like' ? 1 : likeOpacity, scale: forcedBadge === 'like' ? 1.06 : likeScale }}
          className="pointer-events-none absolute left-5 top-20 z-20 origin-left rotate-[-8deg] rounded-2xl border-[3px] border-lime bg-black/35 px-4 py-2 text-lg font-black uppercase tracking-[0.18em] text-lime shadow-2xl backdrop-blur-sm"
        >
          Like
        </motion.div>
        <motion.div
          style={{ opacity: forcedBadge === 'pass' ? 1 : passOpacity, scale: forcedBadge === 'pass' ? 1.06 : passScale }}
          className="pointer-events-none absolute right-5 top-20 z-20 origin-right rotate-[8deg] rounded-2xl border-[3px] border-white bg-black/35 px-4 py-2 text-lg font-black uppercase tracking-[0.18em] text-white shadow-2xl backdrop-blur-sm"
        >
          Pass
        </motion.div>

        <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-ink">{goal}</span>
            {card.compatibility_score ? (
              <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                {Math.round(card.compatibility_score)}% match
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onReport}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/35 text-white/75 backdrop-blur"
            aria-label="Report"
          >
            <IconReport size={18} />
          </button>
        </div>

        {photos.length > 1 && (
          <div className="absolute left-5 right-16 top-16 z-20 flex gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${i === photoIndex ? 'bg-lime' : 'bg-white/25'}`}
              />
            ))}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
          <div className="rounded-[28px] border border-white/10 bg-black/42 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-4xl font-black tracking-[-0.06em] text-white">
                {card.name}
                {card.age ? <span className="font-semibold text-white/85">, {card.age}</span> : null}
              </h2>
              {card.verified ? (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#3b82f6] text-xs font-bold text-white">✓</span>
              ) : null}
            </div>
            {meta.length > 0 ? <p className="mt-1 text-sm font-medium text-white/70">{meta.join(' · ')}</p> : null}
            {card.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/85">{card.bio}</p>}

            {prompt ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lime">{prompt.label || prompt.prompt_key}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-white">{prompt.answer}</p>
              </div>
            ) : null}

            {(detailChips.length > 0 || card.interests?.length > 0) && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[...detailChips, ...(card.interests?.slice(0, 5) || [])].map((chip) => (
                  <span key={chip} className="shrink-0 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white/90">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.article>

      <div className="relative z-10 -mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={!canRewind || busy}
          onClick={onRewind}
          className="action-circle h-12 w-12 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Rewind"
        >
          <IconRewind size={20} className="text-amber-300" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void flyOut('pass')}
          className="action-circle action-circle-pass h-16 w-16 border-white/10 bg-white text-ink"
          aria-label="Pass"
        >
          <IconPass size={26} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSuperLike}
          className="action-circle action-circle-super h-12 w-12"
          aria-label="Super like"
        >
          <IconSuperLike size={20} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void flyOut('like')}
          className="action-circle action-circle-like h-16 w-16"
          aria-label="Like"
        >
          <IconLike size={27} />
        </button>
      </div>
    </div>
  )
}
