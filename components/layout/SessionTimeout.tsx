'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'

export default function SessionTimeout() {
  const { data: session, status } = useSession()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Si el usuario marcó 'Recuérdame' (o sesión normal por defecto), la sesión se gestiona por 30 días
  // sin cierre por inactividad.
  // Si explícitamente desmarcó 'Recuérdame', se aplica un margen razonable de 8 horas de inactividad.
  const rememberMe = (session?.user as any)?.rememberMe !== false
  const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000 // 8 horas

  useEffect(() => {
    // Si no está autenticado o tiene sesión recordada (30 días), no aplicar timeout por inactividad
    if (status !== 'authenticated' || !session || rememberMe) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    const handleLogout = async () => {
      toast.loading('Sesión expirada por inactividad. Redirigiendo...', { id: 'session-timeout' })
      try {
        await signOut({ callbackUrl: '/login', redirect: true })
      } finally {
        window.location.href = '/login'
      }
    }

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT)
    }

    // Eventos que indican actividad del usuario
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    // Registrar escuchadores de eventos
    events.forEach((event) => {
      window.addEventListener(event, resetTimer)
    })

    // Iniciar temporizador inicial
    resetTimer()

    // Limpiar escuchadores al desmontar o cambiar estado
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [session, status, rememberMe])

  return null
}

