'use client'

import { useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../../../saas.module.css'
import { ArrowLeft, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ImportarTablaPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const orgId = params.id as string
  const table = searchParams.get('table') as string

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: string, error?: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('orgId', orgId)
    formData.append('table', table)

    try {
      const response = await fetch('/api/saas/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido al importar')
      }

      setResult({ success: `Se importaron exitosamente ${data.count} registros.` })
      
      // Limpiar archivo tras éxito
      setFile(null)
      
      // Opcional: Volver atrás después de un rato
      // setTimeout(() => router.push(`/saas/clientes/${orgId}`), 3000)

    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Link href={`/saas/clientes/${orgId}`} className="btn btn-ghost" style={{ padding: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 className={styles.title} style={{ margin: 0 }}>Importar Datos</h1>
          </div>
          <p className={styles.subtitle}>Subiendo datos para la tabla: <strong style={{ textTransform: 'uppercase' }}>{table}</strong></p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', background: 'var(--surface-1)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
        
        {result?.success && (
          <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} />
            <strong>{result.success}</strong>
          </div>
        )}

        {result?.error && (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={24} />
            <strong>Error:</strong> {result.error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', border: '2px dashed var(--border)', borderRadius: '12px', background: 'var(--surface-2)', cursor: 'pointer' }} onClick={() => document.getElementById('file-upload')?.click()}>
          <UploadCloud size={48} style={{ color: 'var(--brand-500)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-base)' }}>Haz clic para seleccionar el archivo Excel</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{file ? file.name : 'Formato requerido: .xlsx (usar la plantilla descargada)'}</p>
          
          <input 
            type="file" 
            id="file-upload" 
            accept=".xlsx" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
          />
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '24px', padding: '12px' }} 
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? 'Procesando archivo...' : 'Comenzar Importación'}
        </button>

      </div>
    </div>
  )
}
