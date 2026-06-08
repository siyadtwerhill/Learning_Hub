import { clsx } from 'clsx'

export default function RoleCard({ role, label, description, icon: Icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-200 sm:flex-col sm:items-start sm:gap-2 sm:p-4',
        'hover:border-brand-400 hover:bg-brand-50/50',
        selected
          ? 'border-brand-500 bg-brand-50 shadow-sm shadow-brand-100'
          : 'border-ink/10 bg-white'
      )}
    >
      <div className={clsx(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        selected ? 'bg-brand-100 text-brand-600' : 'bg-surface text-ink/40'
      )}>
        <Icon size={20} />
      </div>
      <div>
        <p className={clsx('text-sm font-semibold font-display', selected ? 'text-brand-700' : 'text-ink')}>
          {label}
        </p>
        <p className="text-xs text-ink/50 mt-0.5 leading-snug">{description}</p>
      </div>
    </button>
  )
}
