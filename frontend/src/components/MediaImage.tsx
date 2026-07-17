import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'
import { mediaCandidates, withCacheBust } from '../lib/media'

type MediaSrcArgs = {
  src?: string | null
  fallbacks?: Array<string | null | undefined>
  placeholder?: string
}

/** Resilient src for motion.img / custom image elements. */
export function useMediaSrc({ src, fallbacks = [], placeholder }: MediaSrcArgs): {
  src: string
  onError: (e?: SyntheticEvent<HTMLImageElement>) => void
} {
  const fallbackKey = fallbacks.filter(Boolean).join('|')
  const candidates = useMemo(
    () => mediaCandidates(src, ...fallbacks, placeholder),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallbackKey captures fallbacks
    [src, fallbackKey, placeholder],
  )

  const [index, setIndex] = useState(0)
  const [retried, setRetried] = useState(false)
  const [current, setCurrent] = useState(candidates[0] ?? '')

  useEffect(() => {
    setIndex(0)
    setRetried(false)
    setCurrent(candidates[0] ?? '')
  }, [candidates])

  const onError = useCallback(() => {
    if (!retried && current && !current.includes('_r=')) {
      setRetried(true)
      setCurrent(withCacheBust(current))
      return
    }

    const next = index + 1
    if (next < candidates.length) {
      setIndex(next)
      setRetried(false)
      setCurrent(candidates[next])
    }
  }, [candidates, current, index, retried])

  return { src: current, onError }
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & MediaSrcArgs

/**
 * Dating-app image: always no-referrer, retries once with cache-bust,
 * then walks fallback URLs so a dead /storage path does not leave a blank face.
 */
export function MediaImage({
  src,
  fallbacks = [],
  placeholder,
  alt = '',
  decoding = 'async',
  ...rest
}: Props) {
  const media = useMediaSrc({ src, fallbacks, placeholder })

  if (!media.src) return null

  return (
    <img
      {...rest}
      src={media.src}
      alt={alt}
      decoding={decoding}
      referrerPolicy="no-referrer"
      onError={media.onError}
    />
  )
}
