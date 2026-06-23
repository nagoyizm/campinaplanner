'use client'

import { useEffect, useState } from 'react'
import { Smartphone, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

export default function WhatsAppSetupPage() {
  const [status, setStatus] = useState<string>('loading')
  const [message, setMessage] = useState<string>('Conectando...')
  const [qr, setQr] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/setup/whatsapp')
      const data = await res.json()
      
      setStatus(data.status)
      setMessage(data.message || '')
      if (data.qr) {
        setQr(data.qr)
      } else {
        setQr(null)
      }

      // Notify Sidebar
      globalThis.dispatchEvent(new CustomEvent('wa-status-change', { detail: { connected: data.status === 'connected' } }))
    } catch (err) {
      console.error('[whatsapp] fetchStatus failed:', err)
      setStatus('offline')
      setMessage('Fallo al conectar con el servidor')
    }
  }

  useEffect(() => {
    fetchStatus()
    // Poll every 5 seconds if not connected
    const interval = setInterval(() => {
      if (status !== 'connected') {
        fetchStatus()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [status])

  const disconnect = async () => {
    if (!confirm('¿Estás seguro que deseas desconectar este dispositivo? Dejarás de enviar mensajes automáticamente.')) return;
    setStatus('loading')
    setMessage('Desconectando...')
    try {
      const res = await fetch('/api/setup/whatsapp', { method: 'DELETE' })
      const data = await res.json()
      
      if (data.remoteLogoutSuccess === false) {
        alert('⚠️ ' + (data.message || 'La sesión se borró del sistema, pero podría seguir apareciendo en tu celular. Bórrala manualmente desde Dispositivos Vinculados.'))
      }
      
      await fetchStatus()
    } catch (err) {
      console.error(err)
      await fetchStatus()
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración de WhatsApp</h1>
          <p className="page-subtitle">Vincula el celular de la empresa para enviar notificaciones automáticas.</p>
        </div>
      </div>

      <div className="card max-w-2xl">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <Smartphone size={18} />
            Estado de Conexión
          </h3>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={fetchStatus}
            disabled={status === 'loading'}
          >
            <RefreshCw size={14} style={{ animation: status === 'loading' ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>
        <div className="card-body flex flex-col items-center justify-center p-12 text-center gap-6">
          
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-muted">
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <p>{message || 'Conectando con el microservicio...'}</p>
            </div>
          )}

          {status === 'offline' && (
            <div className="flex flex-col items-center gap-4 text-red-500">
              <AlertCircle size={48} />
              <h4 className="font-medium text-primary">Microservicio Desconectado</h4>
              <p className="text-sm text-muted">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 text-red-500">
              <AlertCircle size={48} />
              <h4 className="font-medium text-primary">Error de Conexión</h4>
              <p className="text-sm text-muted">{message}</p>
              <p className="text-xs text-muted max-w-sm mt-2">
                Revisa que la contraseña (API KEY) en Vercel/Localhost sea idéntica a la de Render.
              </p>
            </div>
          )}

          {status === 'starting' && (
            <div className="flex flex-col items-center gap-4 text-amber-500">
              <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b' }} />
              <h4 className="font-medium text-primary">Iniciando Cliente WhatsApp...</h4>
              <p className="text-sm text-muted">{message}</p>
            </div>
          )}

          {status === 'scan_required' && qr && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                {/* ponytail: guard ensures only base64 data URLs reach src — nosec */}
                {qr.startsWith('data:image/') && (
                  <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64" /> // nosec
                )}
              </div>
              <h4 className="font-medium">Escanea este código</h4>
              <p className="text-sm text-muted max-w-sm">
                Abre WhatsApp en tu celular corporativo, ve a <strong>Dispositivos Vinculados</strong> y escanea este código.
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="flex flex-col items-center gap-4 text-brand-500 w-full">
              <CheckCircle2 size={64} />
              <h4 className="font-medium text-primary">¡Conectado Exitosamente!</h4>
              <p className="text-sm text-muted">El sistema está listo para enviar notificaciones automáticas.</p>
              <button 
                onClick={disconnect}
                className="btn text-red-600 bg-red-50 hover:bg-red-100 mt-4 border border-red-200"
              >
                Desconectar Dispositivo
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
