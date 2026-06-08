import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff, GraduationCap, BookOpen, Compass } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../services/api'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import RoleCard from '../../components/ui/RoleCard'
import AuthLayout from './AuthLayout'

const ROLES = [
  { role: 'teacher',     label: 'Teacher',     icon: GraduationCap, description: 'Create rooms & assign tasks' },
  { role: 'student',     label: 'Student',     icon: BookOpen,      description: 'Join a class & track tasks'  },
  { role: 'independent', label: 'Solo Learner', icon: Compass,      description: 'Self-paced, no room needed'  },
]

const passwordByteLength = (value = '') => new Blob([value]).size

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false)
  const [role, setRole]         = useState('student')
  const [loading, setLoading]   = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors }, watch } = useForm()
  const password = watch('password', '')

  const onSubmit = async ({ email, username, full_name, password }) => {
    setLoading(true)
    try {
      await registerUser({ email, username, full_name, password, role })
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cannot connect to the backend server'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join TaskFlow and start learning"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Role selector */}
        <div>
          <p className="mb-2.5 text-sm font-medium text-ink/70 font-display">I am a...</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {ROLES.map((r) => (
              <RoleCard key={r.role} {...r} selected={role === r.role} onClick={() => setRole(r.role)} />
            ))}
          </div>
        </div>

        {/* Fields */}
        <Input
          label="Full name"
          type="text"
          icon={User}
          placeholder="Ye Myint Swe"
          error={errors.full_name?.message}
          {...register('full_name', { required: 'Full name is required' })}
        />

        <Input
          label="Username"
          type="text"
          icon={User}
          placeholder="twerhill"
          error={errors.username?.message}
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'Min 3 characters' },
            maxLength: { value: 30, message: 'Max 30 characters' },
            pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Letters, numbers, _ and - only' },
          })}
        />

        <Input
          label="Email address"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
          })}
        />

        <div>
          <Input
            label="Password"
            type={showPass ? 'text' : 'password'}
            icon={Lock}
            placeholder="Min 8 characters"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Min 8 characters' },
              validate: value => passwordByteLength(value) <= 72 || 'Max 72 bytes',
            })}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-ink/40 hover:text-ink/60 transition-colors"
          >
            {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPass ? 'Hide' : 'Show'} password
          </button>
        </div>

        {/* Password strength bar */}
        {password && (
          <PasswordStrength password={password} />
        )}

        <Button type="submit" loading={loading} className="mt-1">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/50">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

function PasswordStrength({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-400']
  const textColors = ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-green-500']

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-ink/10'}`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${textColors[score]}`}>{labels[score]} password</p>
      )}
    </div>
  )
}
