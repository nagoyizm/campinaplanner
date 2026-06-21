'use client'

import { useEffect, useState } from 'react'
import { QrCode, Smartphone, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

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
    } catch (err) {
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
            <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
        <div className="card-body flex flex-col items-center justify-center p-12 text-center gap-6">
          
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-muted">
              <RefreshCw size={32} className="animate-spin" />
              <p>Conectando con el microservicio...</p>
            </div>
          )}

          {status === 'offline' && (
            <div className="flex flex-col items-center gap-4 text-red-500">
              <AlertCircle size={48} />
              <h4 className="font-medium text-primary">Microservicio Desconectado</h4>
              <p className="text-sm text-muted">{message}</p>
            </div>
          )}

          {status === 'starting' && (
            <div className="flex flex-col items-center gap-4 text-amber-500">
              <RefreshCw size={48} className="animate-spin" />
              <h4 className="font-medium text-primary">Iniciando Cliente WhatsApp...</h4>
              <p className="text-sm text-muted">{message}</p>
            </div>
          )}

          {status === 'scan_required' && qr && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64" />
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
              
              <div className="w-full mt-8 pt-8 border-t text-left">
                <h4 className="font-semibold text-primary mb-2">Envío Masivo a Pasajeros Actuales</h4>
                <p className="text-sm text-muted mb-4">
                  Envía un mensaje por WhatsApp a todos los pasajeros que actualmente tienen estado de estadía ("Checked In").
                </p>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const form = e.target as HTMLFormElement
                    const msg = (form.elements.namedItem('broadcastMsg') as HTMLTextAreaElement).value
                    if (!msg) return
                    
                    const btn = form.querySelector('button')
                    if(btn) btn.disabled = true
                    
                    try {
                      const res = await fetch('/api/whatsapp/broadcast', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: msg })
                      })
                      const data = await res.json()
                      alert(data.message || data.error)
                      if(res.ok) form.reset()
                    } catch (err) {
                      alert('Error de red al enviar')
                    } finally {
                      if(btn) btn.disabled = false
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <textarea 
                    name="broadcastMsg"
                    placeholder="Escribe el mensaje aquí... Ej: Les recordamos que el desayuno es hasta las 10:30."
                    className="w-full p-3 border rounded-md min-h-[100px] text-sm"
                    required
                  />
                  <button type="submit" className="btn btn-primary self-end">
                    Enviar a todos
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
