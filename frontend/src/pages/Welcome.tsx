import { useMemo, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { BrandLogo, BRAND_NAME } from '../components/Brand'

type Props = {
  onStart: () => void
}

const slides = [
  {
    word: 'Swipe',
    title: 'Discover people nearby',
    body: 'Browse Habesha profiles with smooth left & right swipes. Pass or like in one motion.',
  },
  {
    word: 'Match',
    title: 'When the feeling is mutual',
    body: 'Like someone who likes you back and unlock a match. No awkward guessing.',
  },
  {
    word: 'Love',
    title: 'Chat and spark something real',
    body: 'Message instantly, stay safe with reports & blocks, and build real connections.',
  },
] as const

/**
 * Single continuous brush-sketched heart.
 * Starts on the left lobe; the final stroke tip lands at the bottom point on page 3.
 */
const HEART_PATH =
  'M 22 50 ' +
  'C 14 30, 28 12, 48 18 ' +
  'C 55 21, 58 32, 60 42 ' +
  'C 63 30, 72 14, 90 18 ' +
  'C 112 22, 122 46, 110 70 ' +
  'C 98 92, 74 108, 60 118'

function BrushHeart({ progress }: { progress: number }) {
  // Soft overshoot so page 3 lands fully drawn
  const drawn = Math.min(1, Math.max(0.08, progress))

  return (
    <div className="relative mx-auto h-[280px] w-[280px]">
      {/* Paper grain / sketch atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #fe3461 0.6px, transparent 0.7px), radial-gradient(circle at 70% 60%, #fff 0.5px, transparent 0.6px)',
          backgroundSize: '14px 14px, 18px 18px',
        }}
      />

      <svg viewBox="0 0 130 130" className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <filter id="brushInk" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" />
          </filter>
        </defs>

        {/* Ghost sketch underneath */}
        <path
          d={HEART_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Living brush stroke */}
        <motion.path
          d={HEART_PATH}
          fill="none"
          stroke="#fe3461"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#brushInk)"
          pathLength={1}
          initial={false}
          animate={{ pathLength: drawn }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Wet edge highlight — same stroke, thinner */}
        <motion.path
          d={HEART_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          initial={false}
          animate={{ pathLength: drawn }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
        />
      </svg>
    </div>
  )
}

export function WelcomeScreen({ onStart }: Props) {
  const [page, setPage] = useState(0)
  const isLast = page === slides.length - 1
  const progress = useMemo(() => (page + 1) / slides.length, [page])
  const slide = slides[page]

  const goNext = () => {
    if (isLast) onStart()
    else setPage((p) => Math.min(slides.length - 1, p + 1))
  }

  const goBack = () => setPage((p) => Math.max(0, p - 1))

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -500) goNext()
    else if (info.offset.x > 70 || info.velocity.x > 500) goBack()
  }

  return (
    <div className="app-shell relative flex min-h-[100dvh] flex-col overflow-hidden pb-8">
      {/* Soft sketch backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(254,52,97,0.12),_transparent_55%)]" />

      <header className="relative z-10 flex items-center justify-between pt-2">
        <BrandLogo size="sm" className="opacity-90" />
        <span className="sr-only">{BRAND_NAME}</span>
        {!isLast && (
          <button
            type="button"
            onClick={onStart}
            className="text-sm font-semibold text-white/45"
          >
            Skip
          </button>
        )}
      </header>

      <div className="relative z-10 mt-4 flex flex-1 flex-col">
        <BrushHeart progress={progress} />

        <div className="mt-2 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? 'w-7 bg-lime' : i < page ? 'w-4 bg-lime/50' : 'w-4 bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className="mt-8 flex flex-1 flex-col text-center"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.28 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-lime">{slide.word}</p>
            <h1 className="mx-auto mt-3 max-w-[14ch] text-[2.35rem] font-bold leading-[1.08] tracking-tight text-white">
              {slide.title}
            </h1>
            <p className="mx-auto mt-4 max-w-[34ch] text-sm leading-relaxed text-muted">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-6 space-y-3">
        <button
          type="button"
          onClick={goNext}
          className="btn-lime flex w-full items-center justify-center gap-2 px-5 py-4 text-base"
        >
          {isLast ? 'Get Started' : 'Continue'}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </button>
        {isLast && (
          <p className="text-center text-xs font-semibold text-white/45">18+ only · Be honest about your age</p>
        )}
      </div>
    </div>
  )
}
