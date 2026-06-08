import { Layers } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-ink overflow-hidden flex-col justify-between p-12">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-600 rounded-full blur-[120px] opacity-30" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-brand-400 rounded-full blur-[100px] opacity-20" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
            <Layers size={20} className="text-white" />
          </div>
          <span className="text-white font-display font-semibold text-lg tracking-tight">TaskFlow</span>
        </div>

        {/* Quote block */}
        <div className="relative">
          <p className="text-white/80 text-2xl font-display font-medium leading-snug mb-6">
            "The secret of getting ahead is getting started."
          </p>
          <p className="text-white/40 text-sm">— Mark Twain</p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '2.4k+', label: 'Students' },
              { value: '180+', label: 'Teachers' },
              { value: '98%', label: 'Completion' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white text-xl font-display font-semibold">{s.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
            <Layers size={18} className="text-white" />
          </div>
          <span className="font-display font-semibold text-ink">TaskFlow</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-8 animate-fade-up">
            <h1 className="text-2xl font-display font-semibold text-ink tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-ink/50">{subtitle}</p>
          </div>
          <div className="animate-fade-up animation-delay-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
