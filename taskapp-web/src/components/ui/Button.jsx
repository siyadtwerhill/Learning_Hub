import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export default function Button({ children, loading, variant = 'primary', className, ...props }) {
  return (
    <button
      disabled={loading || props.disabled}
      className={clsx(
        'relative flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium font-display',
        'transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200',
        variant === 'outline' && 'border border-ink/15 bg-white text-ink hover:bg-ink/5',
        variant === 'ghost'   && 'text-brand-600 hover:bg-brand-50',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  )
}
