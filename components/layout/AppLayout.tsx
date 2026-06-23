'use client'

import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import SessionTimeout from '@/components/layout/SessionTimeout'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [palette, setPalette] = useState('verde')

  // Load theme
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = saved || preferred
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  // Load palette: first from localStorage (instant), then confirm from DB
  useEffect(() => {
    const cached = localStorage.getItem('palette') ?? 'verde'
    setPalette(cached)
    document.documentElement.setAttribute('data-palette', cached)

    fetch('/api/setup/organization')
      .then(r => r.json())
      .then(data => {
        if (data?.colorPalette && data.colorPalette !== cached) {
          setPalette(data.colorPalette)
          document.documentElement.setAttribute('data-palette', data.colorPalette)
          localStorage.setItem('palette', data.colorPalette)
        }
      })
      .catch(() => {/* silencioso si no está logueado */})
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <SessionProvider>
      <SessionTimeout />
      <div className={styles.appLayout}>
        <Sidebar
          theme={theme}
          onThemeToggle={toggleTheme}
          palette={palette}
          onPaletteChange={setPalette}
        />
        <div className={styles.mainArea}>
          <Header title={title} />
          <main className={styles.content}>
            {children}
            {/* Spacer forzado para asegurar espacio debajo de tablas y listas */}
            <div style={{ height: '40px', flexShrink: 0, width: '100%' }} aria-hidden="true" />
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
