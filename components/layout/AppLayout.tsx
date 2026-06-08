'use client'

import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = saved || preferred
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <SessionProvider>
      <div className={styles.appLayout}>
        <Sidebar theme={theme} onThemeToggle={toggleTheme} />
        <div className={styles.mainArea}>
          <Header title={title} />
          <main className={styles.content}>
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
