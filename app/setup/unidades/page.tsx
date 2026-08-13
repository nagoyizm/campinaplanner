'use client'

import { useState, useRef } from 'react'
import { ImageIcon, X } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import SetupPage from '@/components/setup/SetupPage'

const empty = { name: '', description: '', maxOccupancy: 2, sortOrder: 0, active: true, imageUrl: '' }

/** Comprime una imagen via canvas a JPEG, respetando max de ancho/alto y calidad adaptativa */
async function compressImage(file: File): Promise<string> {
  const MAX_W = 800
  const MAX_H = 600
  const MAX_BYTES = 300 * 1024 // 300 KB

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        // Calcular dimensiones proporcionales
        let w = img.width
        let h = img.height
        if (w > MAX_W || h > MAX_H) {
          const ratio = Math.min(MAX_W / w, MAX_H / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)

        // Intentar con calidad decreciente hasta cumplir el límite
        let quality = 0.78
        let dataUrl = canvas.toDataURL('image/jpeg', quality)
        while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.4) {
          quality -= 0.08
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(dataUrl)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function UnidadesPage() {
  const [form, setForm] = useState<any>({ ...empty })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)

  const onFormChange = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Solo se aceptan archivos de imagen.')
      return
    }
    setCompressing(true)
    try {
      const dataUrl = await compressImage(file)
      onFormChange('imageUrl', dataUrl)
    } catch {
      alert('Error al procesar la imagen. Intenta con otro archivo.')
    } finally {
      setCompressing(false)
      // Reset input para permitir volver a seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => onFormChange('imageUrl', '')

  const columns = [
    {
      key: 'imageUrl', label: 'Foto',
      render: (r: any) => r.imageUrl
        ? <span title="Pasa el cursor sobre la fila para ver la imagen" style={{ fontSize: 18 }}>🖼️</span>
        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
    },
    { key: 'name', label: 'Nombre Tipo' },
    { key: 'description', label: 'Descripción', render: (r: any) => r.description || '—' },
    { key: 'maxOccupancy', label: 'Ocup. Máxima' },
    { key: 'sortOrder', label: 'Orden' },
    { key: '_count', label: 'Habitaciones', render: (r: any) => r._count?.rooms ?? 0 },
    { key: 'active', label: 'Estado' },
  ]

  return (
    <SetupPage
      title="Setup — Tipos de Unidad"
      subtitle="Configuración de categorías: Cabaña 5P, Cabaña 7P, Suite, etc."
      apiPath="unidades"
      columns={columns as any}
      formData={form}
      emptyForm={empty}
      onFormChange={onFormChange}
      newButtonLabel="Nuevo Tipo"
      imageKey="imageUrl"
      formFields={
        <>
          <div className="form-group">
            <label className="form-label required">Nombre</label>
            <input className="input" value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Ej: Cabaña 5 Personas" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="input" value={form.description} onChange={e => onFormChange('description', e.target.value)} placeholder="Descripción breve..." />
          </div>
          <div className="form-group">
            <label className="form-label">Ocupación Máxima</label>
            <input className="input" type="number" value={form.maxOccupancy} onChange={e => onFormChange('maxOccupancy', +e.target.value)} min={1} />
          </div>
          <div className="form-group">
            <label className="form-label">Orden de Visualización</label>
            <input className="input" type="number" value={form.sortOrder} onChange={e => onFormChange('sortOrder', +e.target.value)} />
          </div>

          {/* === CAMPO DE IMAGEN === */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon icon={ImageIcon} size="sm" /> Foto de la unidad
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(JPEG/PNG, máx. 300 KB comprimido)</span>
            </label>

            {form.imageUrl ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 6 }}>
                {/* Preview */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={form.imageUrl}
                    alt="Vista previa"
                    style={{
                      width: 160, height: 100, objectFit: 'cover',
                      borderRadius: 8, border: '2px solid var(--border-color)',
                      display: 'block',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Eliminar imagen"
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      background: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: 22, height: 22, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Icon icon={X} size="xs" />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Imagen cargada correctamente.</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cambiar imagen
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                style={{
                  marginTop: 6,
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px',
                  border: '2px dashed var(--border-color)',
                  borderRadius: 8,
                  background: 'transparent',
                  cursor: compressing ? 'wait' : 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  transition: 'border-color 0.15s, color 0.15s',
                  width: '100%',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-500)'; (e.currentTarget as HTMLElement).style.color = 'var(--brand-500)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                <Icon icon={ImageIcon} size="md" />
                {compressing ? 'Comprimiendo...' : 'Seleccionar imagen'}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          {/* ====================== */}

          <div className="form-group">
            <label className="form-label">Estado</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Tipo activo
            </label>
          </div>
        </>
      }
    />
  )
}
