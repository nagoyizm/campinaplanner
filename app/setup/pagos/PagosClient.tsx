'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Plus, Trash2, Globe } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import toast from 'react-hot-toast'

const AUTO_MODES = [
  { value: 'direct', title: 'Confirmación pendiente (pago en el lugar)', description: 'La reserva queda "Reservada" en el calendario, no confirmada. El administrador contacta a la persona para cerrar la reserva o la confirma cuando el pago se hace en el lugar. Aparece en el inicio como alerta para revisarla.' },
  { value: 'transfer', title: 'Transferencia bancaria', description: 'La reserva queda "por confirmar" hasta que ustedes verifiquen el abono y la confirmen manualmente. Se muestran las cuentas destino en la web.' },
  { value: 'gateway', title: 'Pasarela de pago', description: 'La reserva queda "por confirmar" hasta que el pago se confirme por la pasarela (Flow, Mercado Pago, etc.).' },
] as const

const ListEditor = ({ title, description, items, setItems }: { title: string, description: string, items: string[], setItems: (items: string[]) => void }) => (
  <div className="card" style={{ marginBottom: 24 }}>
    <div className="card-header">{title}</div>
    <div className="card-body">
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>{description}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => (
          <div key={`${title}-${idx}`} style={{ display: 'flex', gap: 8 }}>
            <input 
              type="text" 
              className="input" 
              style={{ flex: 1 }} 
              value={item} 
              onChange={(e) => {
                const newItems = [...items]
                newItems[idx] = e.target.value
                setItems(newItems)
              }} 
            />
            <button className="btn btn-ghost" style={{ padding: 8, color: '#ef4444' }} onClick={() => setItems(items.filter((_, i) => i !== idx))}>
              <Icon icon={Trash2} size="md" />
            </button>
          </div>
        ))}
      </div>
      <button 
        className="btn btn-secondary" 
        style={{ marginTop: 12, padding: '4px 12px' }} 
        onClick={() => setItems([...items, ''])}
      >
        <Icon icon={Plus} size="md" /> Añadir Opción
      </button>
    </div>
  </div>
)

export default function PagosClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [dteOptions, setDteOptions] = useState<string[]>([])
  const [bankAccounts, setBankAccounts] = useState<string[]>([])
  const [autoBookingMode, setAutoBookingMode] = useState<string>('direct')

  useEffect(() => {
    fetch('/api/setup/pagos')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setPaymentMethods(data.paymentMethods ? data.paymentMethods.split(',') : [])
          setDteOptions(data.dteOptions ? data.dteOptions.split(',') : [])
          setBankAccounts(data.bankAccounts ? data.bankAccounts.split(',') : [])
          setAutoBookingMode(data.autoBookingMode || 'direct')
        }
        setLoading(false)
      })
      .catch(() => {
        toast.error('Error al cargar datos')
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/setup/pagos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethods: paymentMethods.filter(Boolean).join(','),
          dteOptions: dteOptions.filter(Boolean).join(','),
          bankAccounts: bankAccounts.filter(Boolean).join(','),
          autoBookingMode,
        })
      })
      if (!res.ok) throw new Error('Error al guardar configuración')
      toast.success('Configuración guardada')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <Icon icon={Globe} size="lg" /> Reservas desde la Web
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            Cómo se confirma una reserva creada en <strong>reservas.agendio.cl</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AUTO_MODES.map((m) => (
              <label
                key={m.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: `1.5px solid ${autoBookingMode === m.value ? 'var(--primary)' : 'var(--border)'}`,
                  background: autoBookingMode === m.value ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="autoBookingMode"
                  style={{ marginTop: 2 }}
                  checked={autoBookingMode === m.value}
                  onChange={() => setAutoBookingMode(m.value)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{m.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
      <ListEditor 
        title="Formas de Pago" 
        description="Opciones disponibles al registrar un pago en una reserva."
        items={paymentMethods} 
        setItems={setPaymentMethods} 
      />
      <ListEditor 
        title="DTE (Documentos Tributarios)" 
        description="Tipos de documentos que se pueden emitir."
        items={dteOptions} 
        setItems={setDteOptions} 
      />
      <ListEditor 
        title="Cuentas Destino" 
        description="Cuentas bancarias o de caja donde ingresa el dinero."
        items={bankAccounts} 
        setItems={setBankAccounts} 
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {saving ? <Icon icon={Loader2} size="lg" className="spin" /> : <Icon icon={Save} size="lg" />}
          Guardar Configuración
        </button>
      </div>
    </div>
  )
}
