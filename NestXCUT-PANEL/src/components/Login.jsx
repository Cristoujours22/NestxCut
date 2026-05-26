import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('Intentando login con:', email)
      const result = await login(email, password)
      console.log('Login exitoso:', result.user.email)
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Error login:', err.code, err.message)
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Email inválido')
          break
        case 'auth/user-not-found':
          setError('Usuario no encontrado')
          break
        case 'auth/wrong-password':
          setError('Contraseña incorrecta')
          break
        case 'auth/invalid-credential':
          setError('Credenciales incorrectas')
          break
        case 'auth/network-request-failed':
          setError('Error de red')
          break
        default:
          setError(`Error: ${err.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-container">NESTXCUT</h1>
          <p className="text-sm text-on-surface-variant mt-1">Panel de Administración</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="email@domain.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-outline bg-surface-container-high 
                         text-primary-container focus:ring-primary-container focus:ring-offset-surface"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-on-surface-variant">
                Recordarme
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-error text-sm bg-error-container/20 px-3 py-2 rounded">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : null}
              Iniciar Sesión
            </button>
          </form>

          
        </div>
      </div>
    </div>
  )
}

export default Login