'use client'

import { useState, useEffect } from 'react'
import { Bell, Mail, Smartphone, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './administracion.module.css'

export default function AdministracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState({
    notifyWspResConf: false,
    notifyEmailResConf: false,
    notifyWspCheckOut: false,
    notifyEmailCheckOut: false,
    notifyWspCleaning: false,
    notifyEmailCleaning: false,
    notifyWspInvAlert: false,
    notifyEmailInvAlert: false,
  })

  useEffect(() => {
    fetch('/api/administracion/notificaciones')
      .then(res => {
        if (!res.ok) throw new Error('No autorizado')
        return res.json()
      })
      .then(data => {
        setPrefs(data)
        setLoading(false)
      })
      .catch(() => {
        toast.error('Error al cargar preferencias')
        setLoading(false)
      })
  }, [])

  const handleToggle = (field: keyof typeof prefs) => {
    setPrefs(p => ({ ...p, [field]: !p[field] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/administracion/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      })
      if (!res.ok) throw new Error('Error guardando')
      toast.success('Preferencias guardadas correctamente')
    } catch {
      toast.error('Error al guardar las preferencias')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div>
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title"><Bell size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />Administración</h1>
          <p className="page-subtitle">Configura tus preferencias personales de alertas</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>

      <div className="card" style={{ maxWidth: 800, marginTop: 24 }}>
        <div className="card-header">Centro de Notificaciones</div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Evento a notificar</th>
                <th style={{ width: 120, textAlign: 'center' }}><Smartphone size={16} style={{ marginBottom: -3 }}/> WhatsApp</th>
                <th style={{ width: 120, textAlign: 'center' }}><Mail size={16} style={{ marginBottom: -3 }}/> Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 600 }}>Reserva Confirmada</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuando un pasajero reserva y paga su anticipo</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyWspResConf} onChange={() => handleToggle('notifyWspResConf')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyEmailResConf} onChange={() => handleToggle('notifyEmailResConf')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
              </tr>
              <tr>
                <td>
                  <div style={{ fontWeight: 600 }}>Checkout Realizado</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuando un pasajero hace su salida en recepción</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyWspCheckOut} onChange={() => handleToggle('notifyWspCheckOut')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyEmailCheckOut} onChange={() => handleToggle('notifyEmailCheckOut')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
              </tr>
              <tr>
                <td>
                  <div style={{ fontWeight: 600 }}>Habitación Limpia</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuando el equipo de aseo marca la cabaña como lista</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyWspCleaning} onChange={() => handleToggle('notifyWspCleaning')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyEmailCleaning} onChange={() => handleToggle('notifyEmailCleaning')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
              </tr>
              <tr>
                <td>
                  <div style={{ fontWeight: 600 }}>Alerta de Inventario</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuando el consumo hace que el stock llegue a nivel crítico</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyWspInvAlert} onChange={() => handleToggle('notifyWspInvAlert')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={prefs.notifyEmailInvAlert} onChange={() => handleToggle('notifyEmailInvAlert')} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
