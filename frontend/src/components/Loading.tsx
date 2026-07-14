import type { ButtonHTMLAttributes, ReactNode } from 'react'

type SpinnerProps = {
  className?: string
  label?: string
}

/** Compact spinner for buttons and overlays. */
export function Spinner({ className = 'h-4 w-4', label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <svg
        className={`animate-spin text-current ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
        />
      </svg>
      {label ? <span className="text-sm font-semibold">{label}</span> : null}
      <span className="sr-only">{label || 'Loading'}</span>
    </span>
  )
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingText?: string
  children?: ReactNode
}

export function LoadingButton({
  loading,
  loadingText,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      className={`${className} inline-flex items-center justify-center gap-2 text-center disabled:cursor-not-allowed disabled:opacity-55`}
    >
      {loading ? (
        <>
          <Spinner className="h-4 w-4 shrink-0" />
          <span>{loadingText || 'Please wait…'}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
