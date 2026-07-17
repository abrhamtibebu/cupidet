import { motion } from 'framer-motion'
import { BrandLogo, BRAND_NAME } from './components/Brand'

/** Full-screen brand loading — staggered SVG reveal + soft caption. */
export function BrandLoadingScreen() {
  return (
    <div className="app-shell grid min-h-[100dvh] place-items-center">
      <div className="flex w-full max-w-[280px] flex-col items-center px-4">
        <BrandLogo size="splash" animated className="mx-auto mb-10 w-full" />

        <motion.p
          className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 0.85, 0.45, 0.85], y: 0 }}
          transition={{
            opacity: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
            y: { type: 'spring', stiffness: 200, damping: 24, delay: 0.55 },
          }}
        >
          Opening {BRAND_NAME}
        </motion.p>

        <motion.div
          className="mt-7 h-px w-14 overflow-hidden rounded-full bg-white/[0.08]"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.85, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <motion.div
            className="h-full w-1/2 rounded-full bg-brand"
            initial={{ x: '-120%' }}
            animate={{ x: '220%' }}
            transition={{
              duration: 1.45,
              ease: [0.45, 0, 0.25, 1],
              repeat: Infinity,
              delay: 1,
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
