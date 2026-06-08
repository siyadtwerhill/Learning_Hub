import { clsx } from 'clsx'

export default function ConnectionBadge({ isConnected }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink/55 shadow-sm">
      <span
        className={clsx(
          'h-2.5 w-2.5 rounded-full',
          isConnected ? 'animate-pulse bg-emerald-500' : 'bg-ink/25'
        )}
      />
      {isConnected ? 'Live' : 'Offline'}
    </div>
  )
}
