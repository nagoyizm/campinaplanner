'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, Sun, Moon, Check } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import styles from './login.module.css'

const HIGHLIGHTS = [
  'Disponibilidad en vivo, sin dobles reservas',
  'Pagos, garantías y datos bancarios centralizados',
  'Página pública para que tus clientes reserven solos',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Cargar tema unificado de la app (misma clave localStorage que AppLayout)
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(saved || preferred)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

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
    <div className={styles.page} data-theme={theme}>
      {/* Ambient orbs (estilo landing) */}
      <div className={styles.bgDecor1} aria-hidden="true" />
      <div className={styles.bgDecor2} aria-hidden="true" />

      {/* Toggle de tema */}
      <button
        type="button"
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {theme === 'dark' ? <Icon icon={Sun} size="md" /> : <Icon icon={Moon} size="md" />}
      </button>

      {/* ── Panel de marca (verde bosque editorial) ─────────────────── */}
      <aside className={styles.brandPanel}>
        <div className={styles.brand}>
          <Image src="/logovec.svg" alt="Agendio" width={44} height={44} className={styles.brandLogo} />
          <span className={styles.wordmark}>agendio</span>
        </div>

        <div className={styles.brandBody}>
          <span className={styles.brandEyebrow}>Gestión para alojamientos</span>
          <h2 className={styles.brandTitle}>
            La calma de <em>operar bien.</em>
          </h2>
          <p className={styles.brandCopy}>
            Reservas, huéspedes, finanzas y limpieza en un solo lugar. Sin dobles reservas, sin
            hojas de cálculo ni clientes sin respuesta.
          </p>

          <span className={styles.brandDivider} aria-hidden="true" />

          <ul className={styles.brandList}>
            {HIGHLIGHTS.map(item => (
              <li key={item} className={styles.brandItem}>
                <span className={styles.brandCheck} aria-hidden="true">
                  <Icon icon={Check} size="xs" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.brandFooter}>© {new Date().getFullYear()} Agendio</p>
      </aside>

      {/* ── Panel de formulario (crema editorial) ───────────────────── */}
      <main className={styles.formSide}>
        <div className={styles.card}>
          <span className={styles.cardEyebrow}>Bienvenido de nuevo</span>
          <h1 className={styles.cardTitle}>Inicia sesión</h1>
          <p className={styles.cardSubtitle}>Ingresa a tu panel de gestión para seguir operando.</p>

          {error && (
            <div className={styles.errorMsg} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className={styles.field}
                placeholder="nombre@recinto.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">
                Contraseña
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className={styles.field}
                  placeholder="Tu contraseña"
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
                  {showPass ? <Icon icon={EyeOff} size="md" /> : <Icon icon={Eye} size="md" />}
                </button>
              </div>
            </div>

            <div className={styles.row}>
              <label className={styles.remember}>
                <input type="checkbox" className={styles.checkbox} />
                Recuérdame
              </label>
              <a href="#" className={styles.forgot}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icon icon={Loader2} size="md" className={styles.spinner} />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className={styles.footer}>
          © {new Date().getFullYear()} Agendio. Todos los derechos reservados.
        </p>
      </main>
    </div>
  )
}
