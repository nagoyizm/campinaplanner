'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Plus, Edit2, Trash2, Save, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './SetupPage.module.css'

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
  className?: string
}

interface SetupPageProps<T extends { id: string | number }> {
  title: string
  subtitle?: string
  apiPath: string
  columns: Column<T>[]
  formFields: ReactNode
  emptyForm: Omit<T, 'id'>
  onFormChange: (field: string, value: any) => void
  formData: any
  newButtonLabel?: string
  showInactive?: boolean
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function SetupPage<T extends { id: string | number; active?: boolean }>({
  title, subtitle, apiPath, columns, formFields, emptyForm,
  onFormChange, formData, newButtonLabel = 'Nuevo', showInactive = true,
}: SetupPageProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [hideInactive, setHideInactive] = useState(false)
  const [deleting, setDeleting] = useState<string | number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/setup/${apiPath}`)
      setItems(await res.json())
    } catch { toast.error('Error cargando datos') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleEdit = (item: T) => {
    setEditingId(item.id)
    Object.entries(item as any).forEach(([k, v]) => onFormChange(k, v))
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingId(null)
    Object.entries(emptyForm as any).forEach(([k, v]) => onFormChange(k, v))
    setShowForm(true)
  }

  const handleCancel = () => { setShowForm(false); setEditingId(null) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/setup/${apiPath}/${editingId}` : `/api/setup/${apiPath}`
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      toast.success(editingId ? 'Guardado exitosamente' : 'Creado exitosamente')
      setShowForm(false)
      setEditingId(null)
      await load()
    } catch { toast.error('Error al guardar') }
    setSaving(false)
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/setup/${apiPath}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Eliminado')
      await load()
    } catch { toast.error('No se puede eliminar (puede tener registros relacionados)') }
    setDeleting(null)
  }

  const displayed = hideInactive ? items.filter(i => i.active !== false) : items

  const getCellValue = (row: T, col: Column<T>): ReactNode => {
    if (col.render) return col.render(row)
    const val = (row as any)[col.key as string]
    if (typeof val === 'boolean') {
      return <span className={val ? styles.badgeActive : styles.badgeInactive}>{val ? 'Activo' : 'Inactivo'}</span>
    }
    if (typeof val === 'number' && col.className?.includes('currency')) return formatCLP(val)
    return val ?? '—'
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        <div className={styles.headerActions}>
          {showInactive && (
            <label className={styles.toggleLabel}>
              <input type="checkbox" checked={hideInactive} onChange={e => setHideInactive(e.target.checked)} />
              Solo activos
            </label>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleNew} id={`setup-new-${apiPath}`}>
            <Plus size={14} /> {newButtonLabel}
          </button>
        </div>
      </div>

      {/* Inline form panel */}
      {showForm && (
        <div className={`card ${styles.formPanel}`}>
          <div className="card-header">
            <span className={styles.formTitle}>{editingId ? 'Editar' : 'Nuevo'} {title.replace('Setup — ', '').replace(/s$/, '')}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleCancel}><X size={16} /></button>
          </div>
          <div className="card-body">
            <div className={styles.formGrid}>
              {formFields}
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} id="setup-save">
              {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={13} /> Guardar</>}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-500)' }} />
            <span>Cargando...</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay registros. Crea el primero.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {columns.map(c => <th key={String(c.key)}>{c.label}</th>)}
                  <th style={{ width: 80, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(row => (
                  <tr
                    key={row.id}
                    className={`${editingId === row.id ? styles.editingRow : ''} ${row.active === false ? styles.inactiveRow : ''}`}
                  >
                    {columns.map(col => (
                      <td key={String(col.key)} className={col.className}>
                        {getCellValue(row, col)}
                      </td>
                    ))}
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleEdit(row)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDelete(row.id)}
                          disabled={deleting === row.id}
                          title="Eliminar"
                          style={{ color: '#ef4444' }}
                        >
                          {deleting === row.id
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={14} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
