'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, User } from 'lucide-react'
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
    <div className={styles.page} style={{ fontFamily: '"Montserrat", sans-serif' }}>
      {/* Absolute Logo */}
      <div style={{ position: 'absolute', top: '30px', left: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ padding: 0, overflow: 'hidden', background: 'transparent', boxShadow: 'none' }}>
          <Image src="/logo-habita-round.png" alt="agendio" width={40} height={40} />
        </div>
        <h1 style={{ fontFamily: '"mooxy", sans-serif', fontSize: '20px', letterSpacing: '0.15em', margin: 0, color: 'rgba(255,255,255,0.9)' }}>agendio</h1>
      </div>

      {/* Background decoration */}
      <div className={styles.bgDecor1} />
      <div className={styles.bgDecor2} />

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div className={styles.avatarPlaceholder}>
              <User size={48} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
            </div>
          </div>

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
              placeholder="Email ID"
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
                placeholder="Contraseña"
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: '#339c63' }} />
              Recuérdame
            </label>
            <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontStyle: 'italic' }}>¿Olvidaste tu contraseña?</a>
          </div>

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Ingresando...
              </>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          © {new Date().getFullYear()} Agendio. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
