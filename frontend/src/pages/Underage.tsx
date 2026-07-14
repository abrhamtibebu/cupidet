type Props = {
  onOk: () => void
}

export function UnderageScreen({ onOk }: Props) {
  return (
    <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-red-500/15 text-2xl font-bold text-red-300">
        18+
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">You’re not old enough</h1>
      <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-muted">
        Mingle 251 is only for people 18 and older. No account was created.
      </p>
      <button type="button" className="btn-lime mt-8 px-8 py-3.5" onClick={onOk}>
        OK
      </button>
    </div>
  )
}
