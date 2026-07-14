import { motion, AnimatePresence } from 'framer-motion'

const REASONS = [
  { id: 'fake_profile', label: 'Fake profile' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'spam', label: 'Spam' },
  { id: 'inappropriate_content', label: 'Inappropriate content' },
] as const

type Props = {
  open: boolean
  name?: string
  onClose: () => void
  onSubmit: (reason: string, block: boolean) => void
}

export function ReportSheet({ open, name, onClose, onSubmit }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[430px] rounded-[28px] bg-panel p-5"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="text-xl font-bold">Report {name || 'user'}</h2>
            <p className="mt-1 text-sm text-muted">Help keep Cupid ET safe for the Habesha community.</p>
            <div className="mt-4 space-y-2">
              {REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  className="w-full rounded-2xl bg-[#1e1e1e] px-4 py-3.5 text-left font-semibold hover:bg-[#252525]"
                  onClick={() => onSubmit(reason.id, false)}
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-lime mt-4 w-full py-3.5"
              onClick={() => onSubmit('harassment', true)}
            >
              Report & block
            </button>
            <button type="button" className="mt-3 w-full py-3 text-sm text-muted" onClick={onClose}>
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
