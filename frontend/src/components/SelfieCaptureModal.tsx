import { useEffect, useRef, useState } from 'react'

type Props = {
  open: boolean
  busy?: boolean
  onClose: () => void
  onCapture: (file: File) => void | Promise<void>
}

export function SelfieCaptureModal({ open, busy = false, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setError('')
    setPreviewUrl(null)
    setPreviewFile(null)
    setStarting(true)

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not available in this browser.')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }
      } catch {
        if (!cancelled) {
          setError('Could not open the camera. Allow camera access and try again.')
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!open) return null

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setError('Camera is still starting. Wait a moment, then try again.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Could not capture selfie.')
      return
    }
    // Mirror selfie so it matches what the user sees in preview.
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture selfie.')
          return
        }
        const file = new File([blob], `verification-selfie-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        const url = URL.createObjectURL(blob)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        setPreviewFile(file)
        stopCamera()
      },
      'image/jpeg',
      0.92,
    )
  }

  const retake = async () => {
    setPreviewFile(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setError('')
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
    } catch {
      setError('Could not reopen the camera.')
    } finally {
      setStarting(false)
    }
  }

  const confirm = async () => {
    if (!previewFile || busy) return
    await onCapture(previewFile)
  }

  const close = () => {
    if (busy) return
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-ink shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Take a selfie</p>
            <p className="text-[11px] text-muted">Use your front camera — gallery uploads are not allowed.</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="relative aspect-[3/4] bg-black">
          {previewUrl ? (
            <img src={previewUrl} alt="Selfie preview" className="h-full w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full scale-x-[-1] object-cover"
            />
          )}
          {(starting || busy) && (
            <div className="absolute inset-0 grid place-items-center bg-black/40 text-sm text-white/80">
              {busy ? 'Submitting…' : 'Starting camera…'}
            </div>
          )}
        </div>

        {error ? <p className="px-4 pt-3 text-xs text-red-300">{error}</p> : null}

        <div className="flex gap-2 p-4">
          {previewFile ? (
            <>
              <button
                type="button"
                onClick={() => void retake()}
                disabled={busy}
                className="flex-1 rounded-2xl bg-white/10 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy}
                className="flex-1 rounded-2xl bg-sky-300 py-3 text-sm font-bold text-ink disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Use selfie'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={takePhoto}
              disabled={starting || !!error}
              className="w-full rounded-2xl bg-sky-300 py-3 text-sm font-bold text-ink disabled:opacity-50"
            >
              Capture selfie
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
