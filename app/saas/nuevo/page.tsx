'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganization } from './actions'
import { Building2, User, KeyRound, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import styles from '../saas.module.css'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await createOrganization(formData)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/saas')
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la organización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nuevo Cliente</h1>
          <p className={styles.subtitle}>Crear una nueva organización y cuenta de administrador</p>
        </div>
        <Link href="/saas" className="btn btn-ghost">
          <ArrowLeft size={18} />
          Volver
        </Link>
      </div>

      <div style={{ maxWidth: '600px', background: 'var(--surface-1)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0 }}>
              <Building2 size={18} style={{ color: 'var(--brand-500)' }} />
              Datos de la Organización
            </h3>
            
            <div className="form-group">
              <label>Nombre Comercial</label>
              <input type="text" name="orgName" className="form-control" placeholder="Ej: Cabañas El Bosque" required />
            </div>
            
            <div className="form-group">
              <label>Slug (Identificador único)</label>
              <input type="text" name="orgSlug" className="form-control" placeholder="Ej: el-bosque" required pattern="^[a-z0-9-]+$" title="Solo letras minúsculas, números y guiones" />
              <small style={{ color: 'var(--text-muted)' }}>Se usará para URLs o identificadores internos. Sin espacios.</small>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0 }}>
              <User size={18} style={{ color: 'var(--brand-500)' }} />
              Administrador Inicial
            </h3>
            
            <div className="form-group">
              <label>Nombre del Administrador</label>
              <input type="text" name="adminName" className="form-control" placeholder="Ej: Juan Pérez" required />
            </div>
            
            <div className="form-group">
              <label>Correo Electrónico (Login)</label>
              <input type="email" name="adminEmail" className="form-control" placeholder="admin@elbosque.cl" required />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" name="adminPassword" className="form-control" required minLength={6} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '12px' }} disabled={loading}>
            {loading ? 'Creando infraestructura...' : 'Crear Organización y Usuario'}
          </button>
        </form>
      </div>
    </div>
  )
}
