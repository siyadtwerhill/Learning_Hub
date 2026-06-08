import { forwardRef } from 'react'
import { clsx } from 'clsx'

const Input = forwardRef(({ label, error, icon: Icon, className, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-medium text-ink/70 font-display">{label}</label>
    )}
    <div className="relative">
      {Icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30">
          <Icon size={16} />
        </span>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/30',
          'outline-none transition-all duration-200',
          'border-ink/10 hover:border-ink/20 focus:border-brand-500 focus:ring-3 focus:ring-brand-100',
          Icon && 'pl-10',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))

Input.displayName = 'Input'
export default Input
