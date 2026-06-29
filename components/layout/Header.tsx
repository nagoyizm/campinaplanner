'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, User } from 'lucide-react'
import InternalAssistant from './InternalAssistant'
import styles from './Header.module.css'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: Readonly<HeaderProps>) {
  const { data: session } = useSession()
  const [time, setTime] = useState('')

  useEffect(() => {
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

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {title && <h1 className={styles.pageTitle}>{title}</h1>}
        <span className={styles.datetime}>{time}</span>
      </div>
      <div className={styles.center}>
        <InternalAssistant />
      </div>
      <div className={styles.right}>
        <button className={`btn btn-ghost btn-icon ${styles.iconBtn}`} aria-label="Notificaciones">
          <Bell size={18} />
        </button>
        <div className={styles.userChip}>
          <div className={styles.avatar}>
            <User size={14} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name ?? 'Usuario'}</span>
            <span className={styles.userRole}>
              {(session?.user as any)?.roleName ?? 'Staff'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
