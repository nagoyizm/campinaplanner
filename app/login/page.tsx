'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Hotel, Eye, EyeOff, Loader2 } from 'lucide-react'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenciales incorrectas. Intenta nuevamente.')
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className={styles.page}>
      {/* Background decoration */}
      <div className={styles.bgDecor1} />
      <div className={styles.bgDecor2} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <Hotel size={28} />
          </div>
          <div>
            <h1 className={styles.logoTitle}>PlannerIO</h1>
            <p className={styles.logoSub}>Sistema de Gestión de Reservas</p>
          </div>
        </div>

        <div className={styles.divider} />

        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.formTitle}>Iniciar sesión</h2>

          {error && (
            <div className={styles.errorMsg} role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label required" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="usuario@capiña.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="password">
              Contraseña
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          © {new Date().getFullYear()} PlannerIO. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
