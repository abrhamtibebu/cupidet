import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiscoverCard } from '../types'
import { openTelegramChat } from '../lib/telegram'
import { pickConversationStarters } from '../lib/conversationStarters'
import { IconLike } from './Icons'
import { useMediaSrc } from './MediaImage'

type Props = {
  open: boolean
  matchUser: DiscoverCard | null
  myPhoto?: string | null
  myName?: string
  onChat: (initialMessage?: string) => void
  onContinue: () => void
}

const softSpring = { type: 'spring' as const, stiffness: 420, damping: 28, mass: 0.7 }
const snappy = { type: 'spring' as const, stiffness: 520, damping: 26, mass: 0.55 }
const easeOut = [0.22, 1, 0.36, 1] as const

export function MatchModal({ open, matchUser, myPhoto, myName = 'You', onChat, onContinue }: Props) {
  const telegramUsername = matchUser?.username?.replace(/^@/, '')
  const me = useMediaSrc({ src: myPhoto })
  const them = useMediaSrc({
    src: matchUser?.photo_url,
    fallbacks: matchUser?.photos?.map((p) => p.image_url),
  })
  const starters = useMemo(
    () => (matchUser ? pickConversationStarters(3, String(matchUser.id)) : []),
    [matchUser],
  )

  return (
    <AnimatePresence>
      {open && matchUser && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black/92 px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[38%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(190,242,100,0.22) 0%, rgba(190,242,100,0.06) 42%, transparent 70%)',
            }}
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: easeOut }}
          />

          <motion.div
            className="pointer-events-none absolute left-1/2 top-[38%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime/30"
            initial={{ scale: 0.35, opacity: 0.75 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 0.55, ease: easeOut, delay: 0.08 }}
          />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[38%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime/20"
            initial={{ scale: 0.35, opacity: 0.55 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 0.48, ease: easeOut, delay: 0.14 }}
          />

          {[
            { x: -88, y: -72, d: 0.1 },
            { x: 96, y: -58, d: 0.14 },
            { x: -70, y: 54, d: 0.16 },
            { x: 78, y: 62, d: 0.18 },
            { x: 0, y: -96, d: 0.12 },
          ].map((s, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute left-1/2 top-[38%] h-1.5 w-1.5 rounded-full bg-lime"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0, 1, 0.35] }}
              transition={{ duration: 0.5, delay: s.d, ease: 'easeOut' }}
            />
          ))}

          <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
            <div className="relative mb-6 flex h-[7.5rem] w-[13.5rem] items-center justify-center">
              <motion.img
                src={me.src}
                alt={myName}
                className="absolute left-0 h-[6.75rem] w-[6.75rem] rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-[3px] ring-black"
                referrerPolicy="no-referrer"
                onError={me.onError}
                initial={{ x: -56, opacity: 0, scale: 0.82 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ ...softSpring, delay: 0.02 }}
              />
              <motion.img
                src={them.src}
                alt={matchUser.name}
                className="absolute right-0 h-[6.75rem] w-[6.75rem] rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-[3px] ring-black"
                referrerPolicy="no-referrer"
                onError={them.onError}
                initial={{ x: 56, opacity: 0, scale: 0.82 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ ...softSpring, delay: 0.05 }}
              />
              <motion.div
                className="absolute z-10 grid h-12 w-12 place-items-center rounded-full bg-heart text-white shadow-[0_8px_28px_rgba(255,77,109,0.45)]"
                initial={{ scale: 0, rotate: -18, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ ...snappy, delay: 0.12 }}
              >
                <IconLike size={22} />
              </motion.div>
            </div>

            <motion.p
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-heart"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.18 }}
            >
              Mingle 251
            </motion.p>

            <motion.h2
              className="mt-2 text-center text-[2.35rem] font-bold leading-none tracking-tight text-white"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...softSpring, delay: 0.16 }}
            >
              It&apos;s a Match
            </motion.h2>

            <motion.p
              className="mt-3 max-w-[18rem] text-center text-sm leading-relaxed text-white/55"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.2 }}
            >
              You and <span className="font-semibold text-white">{matchUser.name}</span> liked each
              other. Try a conversation starter:
            </motion.p>

            <motion.div
              className="mt-4 flex w-full flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.2 }}
            >
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onChat(starter)}
                  className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-left text-sm text-white/85 transition hover:border-lime/40 hover:bg-lime/10"
                >
                  {starter}
                </button>
              ))}
            </motion.div>

            <motion.div
              className="mt-5 flex w-full flex-col gap-2.5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.22, ease: easeOut }}
            >
              <button type="button" onClick={() => onChat()} className="btn-lime w-full px-4 py-3.5 text-sm">
                Message {matchUser.name.split(' ')[0]}
              </button>
              {telegramUsername && (
                <button
                  type="button"
                  onClick={() => openTelegramChat(telegramUsername)}
                  className="w-full rounded-full border border-white/12 bg-white/5 px-4 py-3.5 text-center text-sm font-semibold text-white/80"
                >
                  Open @{telegramUsername} in Telegram
                </button>
              )}
              <button
                type="button"
                onClick={onContinue}
                className="w-full rounded-full px-4 py-3.5 text-center text-sm font-semibold text-white/45"
              >
                Keep browsing
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
