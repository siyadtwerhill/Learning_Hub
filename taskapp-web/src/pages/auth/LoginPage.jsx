import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../services/api'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import AuthLayout from './AuthLayout'

const passwordByteLength = (value = '') => new Blob([value]).size

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      const { role } = await login(email, password)
      toast.success('Welcome back!')
      const redirectMap = {
        admin:       '/admin',
        teacher:     '/teacher',
        student:     '/student',
        independent: '/student',
      }
      navigate(redirectMap[role] || '/student')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cannot connect to the backend server'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your TaskFlow account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
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

        <Button type="submit" loading={loading} className="mt-2">
          <Sparkles size={15} />
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/50">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
