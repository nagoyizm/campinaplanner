'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface DeleteButtonProps {
  endpoint: string
  confirmMessage: string
  title?: string
}

export default function DeleteButton({ endpoint, confirmMessage, title = 'Eliminar' }: DeleteButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if wrapped in a Link
    e.stopPropagation() // Prevent bubbling up to parent Link

    if (!window.confirm(confirmMessage)) return

    setLoading(true)
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Eliminado con éxito')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: 'none',
        background: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.2s',
        opacity: loading ? 0.5 : 1
      }}
      title={title}
      aria-label={title}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
    >
      <Trash2 size={16} />
    </button>
  )
}
