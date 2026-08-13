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

  const name = session?.user?.name ?? 'Usuario'
  const roleName = (session?.user as any)?.roleName ?? 'Staff'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')

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
        <div className={styles.userChip} title={`${name} · ${roleName}`}>
          <div className={styles.avatar}>
            {initials || <Icon icon={User} size="sm" />}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{name}</span>
            <span className={styles.userRole}>{roleName}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
