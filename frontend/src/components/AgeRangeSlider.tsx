import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'

type Props = {
  minAge: number
  maxAge: number
  onChange: (minAge: number, maxAge: number) => void
  absoluteMin?: number
  absoluteMax?: number
}

/** One track, two thumbs — drag left (min) or right (max). */
export function AgeRangeSlider({
  minAge,
  maxAge,
  onChange,
  absoluteMin = 18,
  absoluteMax = 60,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const activeThumb = useRef<'min' | 'max' | null>(null)

  const span = absoluteMax - absoluteMin
  const safeMin = Math.max(absoluteMin, Math.min(minAge, maxAge))
  const safeMax = Math.min(absoluteMax, Math.max(maxAge, safeMin))
  const leftPct = ((safeMin - absoluteMin) / span) * 100
  const rightPct = ((safeMax - absoluteMin) / span) * 100

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return absoluteMin
      const rect = track.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return Math.round(absoluteMin + ratio * span)
    },
    [absoluteMin, span],
  )

  const applyMove = useCallback(
    (clientX: number) => {
      if (!activeThumb.current) return
      const next = valueFromClientX(clientX)
      if (activeThumb.current === 'min') {
        onChange(Math.min(next, safeMax), safeMax)
      } else {
        onChange(safeMin, Math.max(next, safeMin))
      }
    },
    [onChange, safeMax, safeMin, valueFromClientX],
  )

  const startDrag = (thumb: 'min' | 'max') => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    activeThumb.current = thumb
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeThumb.current) return
    applyMove(event.clientX)
  }

  const endDrag = () => {
    activeThumb.current = null
  }

  const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const next = valueFromClientX(event.clientX)
    const distMin = Math.abs(next - safeMin)
    const distMax = Math.abs(next - safeMax)
    if (distMin <= distMax) {
      activeThumb.current = 'min'
      onChange(Math.min(next, safeMax), safeMax)
    } else {
      activeThumb.current = 'max'
      onChange(safeMin, Math.max(next, safeMin))
    }
    trackRef.current?.setPointerCapture(event.pointerId)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Age range</p>
        <p className="rounded-full bg-panel px-3 py-1 text-xs font-bold text-lime">
          {safeMin} – {safeMax}
        </p>
      </div>
      <p className="text-xs text-muted">Slide both ends — we’ll suggest people in this range.</p>

      <div
        className="relative touch-none select-none px-1 py-4"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={trackRef}
          data-track="1"
          className="relative h-2 cursor-pointer rounded-full bg-white/15"
          onPointerDown={onTrackPointerDown}
        >
          <div
            data-track="1"
            className="absolute inset-y-0 rounded-full bg-lime"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />

          <button
            type="button"
            aria-label={`Minimum age ${safeMin}`}
            className="absolute top-1/2 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-lime bg-ink shadow-lg"
            style={{ left: `${leftPct}%` }}
            onPointerDown={startDrag('min')}
          />

          <button
            type="button"
            aria-label={`Maximum age ${safeMax}`}
            className="absolute top-1/2 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-lime bg-ink shadow-lg"
            style={{ left: `${rightPct}%` }}
            onPointerDown={startDrag('max')}
          />
        </div>

        <div className="mt-3 flex justify-between text-[11px] font-semibold text-white/40">
          <span>{absoluteMin}</span>
          <span>{absoluteMax}</span>
        </div>
      </div>
    </div>
  )
}

/** Opposite gender for dating preference lock. */
export function datingPreferredGender(userGender: string): 'male' | 'female' | null {
  if (userGender === 'male') return 'female'
  if (userGender === 'female') return 'male'
  return null
}
