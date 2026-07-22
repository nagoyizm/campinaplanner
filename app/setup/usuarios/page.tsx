'use client'

import { useState } from 'react'
import SetupPage from '@/components/setup/SetupPage'
import { MODULES, getDefaultPermissionsForRole, parsePermissions, PermissionLevel, UserPermissions } from '@/lib/permissions'
import { ShieldCheck, Lock, Eye, Edit3, ShieldAlert } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Administrador (Full)' },
  { value: 'operator', label: 'Operador' },
  { value: 'recepcionista', label: 'Recepcionista' },
  { value: 'empleado', label: 'Empleado / Mucama' },
  { value: 'observer', label: 'Solo Lectura (Observador)' },
]

const emptyPermissions = getDefaultPermissionsForRole('operator')
const empty = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'operator',
  roleName: 'Recepción',
  permissions: emptyPermissions,
  active: true
}

export default function UsuariosPage() {
  const [form, setForm] = useState<any>({ ...empty })

  const onFormChange = (field: string, value: any) => {
    setForm((f: any) => {
      const updated = { ...f, [field]: value }
      if (field === 'role') {
        // When system role changes, update default permissions if custom perms not set
        updated.permissions = getDefaultPermissionsForRole(value)
      }
      return updated
    })
  }

  const currentPermissions: UserPermissions = typeof form.permissions === 'string'
    ? parsePermissions(form.permissions, form.role)
    : (form.permissions || getDefaultPermissionsForRole(form.role))

  const handlePermissionChange = (moduleKey: string, level: PermissionLevel) => {
    const nextPerms = { ...currentPermissions, [moduleKey]: level }
    setForm((f: any) => ({ ...f, permissions: nextPerms }))
  }

  const handleApplyPreset = (rolePreset: string) => {
    const presetPerms = getDefaultPermissionsForRole(rolePreset)
    setForm((f: any) => ({ ...f, permissions: presetPerms }))
  }

  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Celular' },
    { key: 'roleName', label: 'Cargo / Puesto' },
    { key: 'role', label: 'Rol Sistema', render: (r: any) => (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
        background: r.role === 'admin' ? '#fef3c7' : r.role === 'observer' ? '#e0e7ff' : '#d1fae5',
        color: r.role === 'admin' ? '#92400e' : r.role === 'observer' ? '#3730a3' : '#065f46' }}>
        {ROLES.find(ro => ro.value === r.role)?.label ?? r.role}
      </span>
    )},
    { key: 'active', label: 'Estado' },
  ]

  const categories = [
    { id: 'operaciones', title: 'Operaciones e Interfaz Principal' },
    { id: 'reportes', title: 'Reportes y Analíticas' },
    { id: 'configuracion', title: 'Configuración del Recinto (Setup)' },
  ]

  return (
    <SetupPage
      title="Setup — Usuarios y Permisos"
      subtitle="Gestión de acceso al sistema, cargos y matriz de permisos por pestaña"
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
            <input id="name" className="input" value={form.name || ''} onChange={e => onFormChange('name', e.target.value)} placeholder="Ana García" />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label required">Email</label>
            <input id="email" className="input" type="email" value={form.email || ''} onChange={e => onFormChange('email', e.target.value)} placeholder="ana@campina.cl" />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">Celular (WhatsApp)</label>
            <input id="phone" className="input" type="tel" value={form.phone || ''} onChange={e => onFormChange('phone', e.target.value)} placeholder="+56912345678" />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Contraseña {form.id && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(vacío = no cambiar)</span>}
            </label>
            <input id="password" className="input" type="password" value={form.password || ''} onChange={e => onFormChange('password', e.target.value)} placeholder={form.id ? '(dejar vacío para no cambiar)' : 'Contraseña...'} />
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">Rol Base del Sistema</label>
            <select id="role" className="select" value={form.role || 'operator'} onChange={e => onFormChange('role', e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="roleName" className="form-label">Cargo / Puesto personalizado</label>
            <input id="roleName" className="input" value={form.roleName || ''} onChange={e => onFormChange('roleName', e.target.value)} placeholder="Ej: Recepción, Mucama, Encargado Tarifas..." />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Estado</label>
            <label htmlFor="active" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, fontSize: 13, cursor: 'pointer' }}>
              <input id="active" type="checkbox" checked={form.active !== false} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Usuario activo (Permite iniciar sesión)
            </label>
          </div>

          {/* ── MATRIZ DE PERMISOS GRANULARES ── */}
          <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={18} style={{ color: 'var(--brand-500)' }} /> Matriz de Permisos por Pestaña / Módulo
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Configura exactamente a qué áreas tiene acceso este usuario y si puede escribir/modificar datos o solo verlos.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Cargar Plantilla:</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => handleApplyPreset('admin')}>Full Admin</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => handleApplyPreset('operator')}>Operador</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => handleApplyPreset('observer')}>Solo Lectura</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--surface-2)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
              {categories.map(cat => {
                const catModules = MODULES.filter(m => m.category === cat.id)
                return (
                  <div key={cat.id}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.05em' }}>
                      {cat.title}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                      {catModules.map(mod => {
                        const level = currentPermissions[mod.key] || 'none'
                        return (
                          <div key={mod.key} style={{
                            background: 'var(--surface-1)', padding: '8px 12px', borderRadius: 6,
                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{mod.label}</span>
                            <select
                              value={level}
                              onChange={e => handlePermissionChange(mod.key, e.target.value as PermissionLevel)}
                              style={{
                                fontSize: 12, fontWeight: 600, padding: '4px 6px', borderRadius: 4,
                                border: '1px solid var(--border)',
                                background: level === 'none' ? '#fee2e2' : level === 'read' ? '#e0e7ff' : level === 'write' ? '#d1fae5' : '#fef3c7',
                                color: level === 'none' ? '#991b1b' : level === 'read' ? '#3730a3' : level === 'write' ? '#065f46' : '#92400e',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="none">🚫 Sin Acceso</option>
                              <option value="read">👁️ Solo Lectura</option>
                              <option value="write">✏️ Editar / Escribir</option>
                              <option value="full">👑 Control Total</option>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      }
    />
  )
}

