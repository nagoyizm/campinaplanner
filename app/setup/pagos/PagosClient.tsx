'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button 
        className="btn btn-secondary" 
        style={{ marginTop: 12, padding: '4px 12px' }} 
        onClick={() => setItems([...items, ''])}
      >
        <Plus size={16} /> Añadir Opción
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

  useEffect(() => {
    fetch('/api/setup/pagos')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setPaymentMethods(data.paymentMethods ? data.paymentMethods.split(',') : [])
          setDteOptions(data.dteOptions ? data.dteOptions.split(',') : [])
          setBankAccounts(data.bankAccounts ? data.bankAccounts.split(',') : [])
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
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Guardar Configuración
        </button>
      </div>
    </div>
  )
}
