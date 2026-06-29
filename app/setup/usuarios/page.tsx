'use client'

import { useState } from 'react'
import SetupPage from '@/components/setup/SetupPage'

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operator', label: 'Operador' },
  { value: 'observer', label: 'Solo lectura' },
]

const empty = { name: '', email: '', phone: '', password: '', role: 'operator', roleName: 'Recepción', active: true }

export default function UsuariosPage() {
  const [form, setForm] = useState<any>({ ...empty })
  const onFormChange = (field: string, value: any) => {
    setForm((f: any) => ({ ...f, [field]: value }))
  }

  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Celular' },
    { key: 'roleName', label: 'Cargo' },
    { key: 'role', label: 'Rol Sistema', render: (r: any) => (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
        background: r.role === 'admin' ? '#fef3c7' : r.role === 'observer' ? '#e0e7ff' : '#d1fae5',
        color: r.role === 'admin' ? '#92400e' : r.role === 'observer' ? '#3730a3' : '#065f46' }}>
        {ROLES.find(ro => ro.value === r.role)?.label ?? r.role}
      </span>
    )},
    { key: 'active', label: 'Estado' },
  ]

  return (
    <SetupPage
      title="Setup — Usuarios"
      subtitle="Gestión de acceso al sistema y roles del equipo"
      apiPath="usuarios"
      columns={columns as any}
      formData={form}
      emptyForm={empty}
      onFormChange={onFormChange}
      newButtonLabel="Nuevo Usuario"
      formFields={
        <>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Nombre completo</label>
            <input id="name" className="input" value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Ana García" />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label required">Email</label>
            <input id="email" className="input" type="email" value={form.email} onChange={e => onFormChange('email', e.target.value)} placeholder="ana@capiña.cl" />
          </div>
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Celular (WhatsApp)</label>
            <input id="phone" className="input" type="tel" value={form.phone || ''} onChange={e => onFormChange('phone', e.target.value)} placeholder="+56912345678" />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Contraseña {form.id && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(vacío = no cambiar)</span>}
            </label>
            <input id="password" className="input" type="password" value={form.password} onChange={e => onFormChange('password', e.target.value)} placeholder={form.id ? '(dejar vacío para no cambiar)' : 'Contraseña...'} />
          </div>
          <div className="form-group">
            <label htmlFor="role" className="form-label">Rol del Sistema</label>
            <select id="role" className="select" value={form.role} onChange={e => onFormChange('role', e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="roleName" className="form-label">Cargo / Puesto</label>
            <input id="roleName" className="input" value={form.roleName} onChange={e => onFormChange('roleName', e.target.value)} placeholder="Ej: Recepción, Mucama, Gerencia..." />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <label htmlFor="active" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
              <input id="active" type="checkbox" checked={form.active} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Usuario activo
            </label>
          </div>
        </>
      }
    />
  )
}
