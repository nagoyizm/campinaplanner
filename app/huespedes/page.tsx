'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search, Plus, Edit2, Trash2, Save, X, Loader2,
  Upload, ChevronLeft, ChevronRight, Crown, Star,
  Volume2, AlertTriangle, Repeat, Phone, Mail, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './huespedes.module.css'

interface Guest {
  id: string
  firstName: string
  lastName: string
  rut: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  address: string | null
  notes: string | null
  tags: string
  totalStays: number
  createdAt: string
}

const NATIONALITIES = [
  'Chile', 'Argentina', 'Brasil', 'Colombia', 'Perú', 'Uruguay',
  'Venezuela', 'Ecuador', 'Bolivia', 'México', 'España', 'Estados Unidos', 'Otra'
]

const empty: Omit<Guest, 'id' | 'totalStays' | 'createdAt'> = {
  firstName: '', lastName: '', rut: '', email: '', phone: '+56',
  nationality: 'Chile', address: '', notes: '', tags: '[]'
}

export default function HuespedesPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...empty })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const LIMIT = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (search) params.set('q', search)
      const res = await fetch(`/api/huespedes?${params}`)
      const data = await res.json()
      if (search) {
        setGuests(data)
        setTotal(data.length)
      } else {
        setGuests(data.guests)
        setTotal(data.total)
      }
    } catch { toast.error('Error cargando huéspedes') }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  const handleNew = () => {
    setEditingId(null)
    setForm({ ...empty })
    setShowForm(true)
  }

  const handleEdit = (g: Guest) => {
    setEditingId(g.id)
    setForm({
      firstName: g.firstName, lastName: g.lastName, rut: g.rut || '',
      email: g.email || '', phone: g.phone || '+56',
      nationality: g.nationality || 'Chile', address: g.address || '',
      notes: g.notes || '', tags: g.tags || '[]',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) {
      toast.error('Nombre y apellido son requeridos')
      return
    }
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/huespedes/${editingId}` : '/api/huespedes'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success(editingId ? 'Huésped actualizado' : 'Huésped creado')
      setShowForm(false)
      await load()
    } catch { toast.error('Error al guardar') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este huésped? Se eliminará también su historial.')) return
    setDeleting(id)
    try {
      await fetch(`/api/huespedes/${id}`, { method: 'DELETE' })
      toast.success('Huésped eliminado')
      await load()
    } catch { toast.error('No se puede eliminar (tiene reservas asociadas)') }
    setDeleting(null)
  }

  const totalPages = Math.ceil(total / LIMIT)

  const parseTags = (tags: string): string[] => {
    try { return JSON.parse(tags) } catch { return [] }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Base de Huéspedes</h1>
          <p className="page-subtitle">{total} huéspedes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleNew} id="guest-new">
            <Plus size={14} /> Nuevo Huésped
          </button>
        </div>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className={`card ${styles.formPanel}`}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {editingId ? 'Editar Huésped' : 'Nuevo Huésped'}
            </span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="card-body">
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label required">Nombre</label>
                <input className="input" value={form.firstName} onChange={e => setForm((f: any) => ({ ...f, firstName: e.target.value }))} placeholder="Juan" />
              </div>
              <div className="form-group">
                <label className="form-label required">Apellido</label>
                <input className="input" value={form.lastName} onChange={e => setForm((f: any) => ({ ...f, lastName: e.target.value }))} placeholder="Pérez" />
              </div>
              <div className="form-group">
                <label className="form-label">RUT</label>
                <input className="input" value={form.rut} onChange={e => setForm((f: any) => ({ ...f, rut: e.target.value }))} placeholder="12.345.678-9" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.cl" />
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                <input className="input" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+569..." />
              </div>
              <div className="form-group">
                <label className="form-label">Nacionalidad</label>
                <select className="select" value={form.nationality} onChange={e => setForm((f: any) => ({ ...f, nationality: e.target.value }))}>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Dirección</label>
                <input className="input" value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Calle, ciudad" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas internas</label>
                <textarea className="textarea" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Observaciones, preferencias, historial..." style={{ minHeight: 70 }} />
              </div>
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} id="guest-save">
              {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={13} /> Guardar</>}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className={styles.searchBar}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nombre, RUT, email o teléfono..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, gap: 10, color: 'var(--text-muted)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-500)' }} />
            Cargando...
          </div>
        ) : guests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>
            {search ? 'Sin resultados para la búsqueda.' : 'No hay huéspedes registrados aún.'}
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>RUT</th>
                    <th>Contacto</th>
                    <th>Nacionalidad</th>
                    <th>Estadías</th>
                    <th>Notas</th>
                    <th>Registrado</th>
                    <th style={{ width: 80 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map(g => (
                    <tr key={g.id}>
                      <td>
                        <div className={styles.guestName}>
                          <span className={styles.avatarCircle}>
                            {g.firstName[0]}{g.lastName[0]}
                          </span>
                          <div>
                            <strong>{g.firstName} {g.lastName}</strong>
                          </div>
                        </div>
                      </td>
                      <td className={styles.mutedCell}>{g.rut || '—'}</td>
                      <td>
                        <div className={styles.contactCell}>
                          {g.phone && (
                            <span className={styles.contactItem}><Phone size={11} />{g.phone}</span>
                          )}
                          {g.email && (
                            <span className={styles.contactItem}><Mail size={11} />{g.email}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {g.nationality && (
                          <span className={styles.natBadge}><Globe size={10} />{g.nationality}</span>
                        )}
                      </td>
                      <td className={styles.staysCell}>
                        <span className={styles.staysBadge}>{g.totalStays}</span>
                      </td>
                      <td className={styles.notesCell}>
                        {g.notes ? (
                          <span title={g.notes}>{g.notes.length > 40 ? g.notes.slice(0, 40) + '...' : g.notes}</span>
                        ) : '—'}
                      </td>
                      <td className={styles.mutedCell}>
                        {format(new Date(g.createdAt), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(g)} title="Editar"><Edit2 size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(g.id)} disabled={deleting === g.id} title="Eliminar" style={{ color: '#ef4444' }}>
                            {deleting === g.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!search && totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.pageInfo}>{total} resultados · Página {page} de {totalPages}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft size={14} />
                  </button>
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
