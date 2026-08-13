'use client'

import { useState, useEffect, ReactNode, useRef } from 'react'
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react'
import Icon from '@/components/ui/Icon'
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
  /** Field name on each row that holds an image URL/base64. Enables hover preview. */
  imageKey?: string
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function SetupPage<T extends { id: string | number; active?: boolean }>({
  title, subtitle, apiPath, columns, formFields, emptyForm,
  onFormChange, formData, newButtonLabel = 'Nuevo', showInactive = true,
  imageKey,
}: SetupPageProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [hideInactive, setHideInactive] = useState(false)
  const [deleting, setDeleting] = useState<string | number | null>(null)

  // Hover preview state
  const [hoverImg, setHoverImg] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleRowMouseEnter = (e: React.MouseEvent, row: T) => {
    if (!imageKey) return
    const img = (row as any)[imageKey] as string | null | undefined
    if (!img) return
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setHoverPos({ x: rect.right + 12, y: rect.top + window.scrollY })
      setHoverImg(img)
    }, 180)
  }

  const handleRowMouseLeave = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setHoverImg(null)
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
      {/* Hover image preview — fixed, follows mouse row */}
      {hoverImg && (
        <div
          className={styles.hoverPreview}
          style={{ top: hoverPos.y, left: hoverPos.x }}
        >
          <img src={hoverImg} alt="Vista previa" className={styles.hoverPreviewImg} />
        </div>
      )}

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
            <Icon icon={Plus} size="sm" /> {newButtonLabel}
          </button>
        </div>
      </div>

      {/* Inline form panel */}
      {showForm && (
        <div className={`card ${styles.formPanel}`}>
          <div className="card-header">
            <span className={styles.formTitle}>{editingId ? 'Editar' : 'Nuevo'} {title.replace('Setup — ', '').replace(/s$/, '')}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleCancel}><Icon icon={X} size="md" /></button>
          </div>
          <div className="card-body">
            <div className={styles.formGrid}>
              {formFields}
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} id="setup-save">
              {saving ? <><Icon icon={Loader2} size="xs" spin /> Guardando...</> : <><Icon icon={Save} size="xs" /> Guardar</>}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className={styles.loadingState}>
            <Icon icon={Loader2} size="2xl" spin color="var(--brand-500)" />
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
                    className={`${editingId === row.id ? styles.editingRow : ''} ${row.active === false ? styles.inactiveRow : ''} ${imageKey && (row as any)[imageKey] ? styles.hasImageRow : ''}`}
                    onMouseEnter={imageKey ? (e) => handleRowMouseEnter(e, row) : undefined}
                    onMouseLeave={imageKey ? handleRowMouseLeave : undefined}
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
                          <Icon icon={Edit2} size="sm" />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDelete(row.id)}
                          disabled={deleting === row.id}
                          title="Eliminar"
                          style={{ color: '#ef4444' }}
                        >
                          {deleting === row.id
                            ? <Icon icon={Loader2} size="sm" spin />
                            : <Icon icon={Trash2} size="sm" />
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
