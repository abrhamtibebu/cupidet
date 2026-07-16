import { BrandIcon, BRAND_NAME } from '../components/Brand'

type Props = {
  status: 'banned' | 'suspended'
  onSignOut: () => void
}

export function AccountRestrictedScreen({ status, onSignOut }: Props) {
  const banned = status === 'banned'

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center px-5 text-center">
      <BrandIcon size="lg" className="mb-6 opacity-90" />
      <div
        className={`grid h-16 w-16 place-items-center rounded-full text-2xl font-bold ${
          banned ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'
        }`}
      >
        {banned ? '!' : '⏸'}
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        {banned ? 'Account banned' : 'Account suspended'}
      </h1>
      <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
        {banned
          ? `Your ${BRAND_NAME} account has been permanently banned for violating community guidelines. You can’t use discover, likes, or chat.`
          : `Your ${BRAND_NAME} account is temporarily suspended. Discover, likes, and chat are unavailable until an admin restores access.`}
      </p>
      <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
        If you think this is a mistake, contact support through the {BRAND_NAME} Telegram channel or bot.
      </p>
      <button type="button" className="btn-lime mt-8 px-8 py-3.5" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  )
}
