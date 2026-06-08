import { useAuth } from '../../context/AuthContext'
import { Layers } from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
          <Layers size={20} className="text-white" />
        </div>
        <span className="font-display font-semibold text-ink text-lg">TaskFlow</span>
      </div>
      <div className="bg-white rounded-2xl border border-ink/10 p-8 text-center shadow-sm max-w-sm w-full">
        <p className="text-2xl font-display font-semibold text-ink">Hi, {user?.full_name}!</p>
        <p className="mt-2 text-sm text-ink/50 capitalize">{user?.role} dashboard — coming next</p>
        <button onClick={logout} className="mt-6 text-sm text-brand-600 hover:underline">Sign out</button>
      </div>
    </div>
  )
}
