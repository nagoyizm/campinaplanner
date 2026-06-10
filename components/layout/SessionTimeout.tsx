'use client'

import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { toast } from 'react-hot-toast'

export default function SessionTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Tiempo límite: 15 minutos (15 * 60 * 1000 ms)
  const INACTIVITY_LIMIT = 15 * 60 * 1000

  useEffect(() => {
    const handleLogout = () => {
      toast.loading('Sesión expirada por inactividad. Redirigiendo...', { id: 'session-timeout' })
      // Forzar cierre de sesión y redirección a login
      signOut({ callbackUrl: '/login' })
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

    // Limpiar escuchadores al desmontar
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [])

  return null
}
