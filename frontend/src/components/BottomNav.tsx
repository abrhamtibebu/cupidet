import { NavLink } from 'react-router-dom'
import type { ComponentType } from 'react'
import { useNavBadges } from '../lib/navBadges'
import { IconDiscover, IconLikes, IconMessages, IconProfile } from './Icons'

type Item = {
  to: string
  label: string
  Icon: ComponentType<{ size?: number | string; className?: string }>
  badgeKey?: 'unreadMessages' | 'newLikes'
}

const items: Item[] = [
  { to: '/discover', label: 'Discover', Icon: IconDiscover },
  { to: '/likes', label: 'Likes', Icon: IconLikes, badgeKey: 'newLikes' },
  { to: '/messages', label: 'Messages', Icon: IconMessages, badgeKey: 'unreadMessages' },
  { to: '/profile', label: 'Profile', Icon: IconProfile },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime px-1 text-[9px] font-bold leading-none text-ink">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function BottomNav() {
  const badges = useNavBadges()

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-white/5 bg-black/95 backdrop-blur-md">
      <div className="grid grid-cols-4 gap-1 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const count =
            item.badgeKey === 'unreadMessages'
              ? badges.unreadMessages
              : item.badgeKey === 'newLikes'
                ? badges.newLikes
                : 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold tracking-wide transition ${
                  isActive ? 'text-lime' : 'text-white/40'
                }`
              }
            >
              <span className="relative">
                <item.Icon size={22} />
                <Badge count={count} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
