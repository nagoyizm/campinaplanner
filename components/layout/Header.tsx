'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { User } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import InternalAssistant from './InternalAssistant'
import styles from './Header.module.css'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: Readonly<HeaderProps>) {
  const { data: session } = useSession()
  const [time, setTime] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }))
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const name = session?.user?.name ?? 'Usuario'
  const roleName = (session?.user as any)?.roleName ?? 'Staff'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {title && <h1 className={styles.pageTitle}>{title}</h1>}
        <span className={styles.datetime} suppressHydrationWarning>{time}</span>
      </div>
      <div className={styles.center}>
        <InternalAssistant />
      </div>
      <div className={styles.right}>
        <div className={styles.userChip} title={`${name} · ${roleName}`} suppressHydrationWarning>
          <div className={styles.avatar} suppressHydrationWarning>
            {mounted ? (initials || <Icon icon={User} size="sm" />) : <Icon icon={User} size="sm" />}
          </div>
          <div className={styles.userInfo} suppressHydrationWarning>
            <span className={styles.userName} suppressHydrationWarning>{mounted ? name : 'Usuario'}</span>
            <span className={styles.userRole} suppressHydrationWarning>{mounted ? roleName : 'Staff'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
