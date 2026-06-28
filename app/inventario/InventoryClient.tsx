'use client'

import { useState } from 'react'
import { Plus, Minus, Search, PackagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  name: string
  category: string
  unitCost: number
  currentQuantity: number
  minQuantity: number
}

interface Props {
  items: InventoryItem[]
}

export default function InventoryClient({ items: initialItems }: Readonly<Props>) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: 'Limpieza', unitCost: 0, minQuantity: 0 })
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)

  const [transactionModal, setTransactionModal] = useState<{item: InventoryItem, type: 'purchase' | 'usage'} | null>(null)
  const [transactionQty, setTransactionQty] = useState(1)
  const [transactionNotes, setTransactionNotes] = useState('')

  const categories = Array.from(new Set(items.map(i => i.category)))
  if (!categories.includes('Limpieza')) categories.push('Limpieza')
  if (!categories.includes('Amenidades')) categories.push('Amenidades')
  if (!categories.includes('Mantenimiento')) categories.push('Mantenimiento')
  if (!categories.includes('Ropa de Cama')) categories.push('Ropa de Cama')
  if (!categories.includes('Alimentos y Bebidas')) categories.push('Alimentos y Bebidas')
  if (!categories.includes('Otros')) categories.push('Otros')

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCategory === '' || i.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })
      if (!res.ok) throw new Error('Error creando producto')
      const created = await res.json()
      setItems([...items, created].sort((a, b) => a.name.localeCompare(b.name)))
      setShowNewModal(false)
      setNewItem({ name: '', category: 'Limpieza', unitCost: 0, minQuantity: 0 })
      toast.success('Producto creado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editItem) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/inventario/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem)
      })
      if (!res.ok) throw new Error('Error actualizando producto')
      const updated = await res.json()
      setItems(items.map(i => i.id === updated.id ? updated : i).sort((a, b) => a.name.localeCompare(b.name)))
      setShowEditModal(false)
      setEditItem(null)
      toast.success('Producto actualizado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!transactionModal) return
    if (transactionQty <= 0) return toast.error('La cantidad debe ser mayor a 0')
    if (transactionModal.type === 'usage' && transactionModal.item.currentQuantity < transactionQty) {
      return toast.error('No hay suficiente stock para este uso')
    }

    setUpdating(true)
    try {
      const res = await fetch('/api/inventario/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: transactionModal.item.id,
          type: transactionModal.type,
          quantity: transactionQty,
          notes: transactionNotes
        })
      })
      
      if (!res.ok) throw new Error('Error al procesar transacción')
      
      const { item: updatedItem } = await res.json()
      
      // Update local state
      setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i))
      
      setTransactionModal(null)
      setTransactionQty(1)
      setTransactionNotes('')
      toast.success(transactionModal.type === 'purchase' ? 'Compra registrada' : 'Consumo registrado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!globalThis.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${name}" del inventario?`)) return
    
    setUpdating(true)
    try {
      const res = await fetch(`/api/inventario/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar producto')
      
      setItems(items.filter(i => i.id !== id))
      toast.success('Producto eliminado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }


  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      
      {/* Toolbar */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)', fontSize: '0.9rem' }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)', fontSize: '0.9rem' }}
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button 
          onClick={() => setShowNewModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--brand-600)', color: 'white', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          <PackagePlus size={18} />
          Nuevo Producto
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Producto</th>
              <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Categoría</th>
              <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Costo Unitario</th>
              <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Stock</th>
              <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Costo Total</th>
              <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-base)' }}>{item.name}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--surface-3)', padding: '4px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    {item.category}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>${item.unitCost.toLocaleString('es-CL')}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 700, 
                    color: item.currentQuantity <= item.minQuantity ? '#ef4444' : 'var(--text-base)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {item.currentQuantity}
                    {item.currentQuantity <= item.minQuantity && <span style={{ fontSize: '0.7rem', color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>Bajo Stock</span>}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-base)' }}>
                  ${(item.unitCost * item.currentQuantity).toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setEditItem(item); setShowEditModal(true); }}
                      title="Editar Producto"
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#3b82f6', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => setTransactionModal({ item, type: 'usage' })}
                      title="Registrar Uso / Merma"
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Minus size={16} />
                    </button>
                    <button 
                      onClick={() => setTransactionModal({ item, type: 'purchase' })}
                      title="Registrar Compra"
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #a7f3d0', background: '#f0fdf4', color: '#10b981', cursor: 'pointer' }}
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.name)}
                      disabled={updating}
                      title="Eliminar Producto"
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron productos en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Item Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateItem} style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-base)' }}>Crear Producto</h2>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Nombre</span>
              <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Categoría</span>
              <select required value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Costo Unitario ($)</span>
                <input required type="number" min="0" value={newItem.unitCost} onChange={e => setNewItem({...newItem, unitCost: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Alerta Mínima</span>
                <input required type="number" min="0" value={newItem.minQuantity} onChange={e => setNewItem({...newItem, minQuantity: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-base)', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={updating} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--brand-600)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleUpdateItem} style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-base)' }}>Editar Producto</h2>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Nombre</span>
              <input required type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Categoría</span>
              <select required value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Costo Unitario ($)</span>
                <input required type="number" min="0" value={editItem.unitCost} onChange={e => setEditItem({...editItem, unitCost: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Alerta Mínima</span>
                <input required type="number" min="0" value={editItem.minQuantity} onChange={e => setEditItem({...editItem, minQuantity: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-base)', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={updating} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--brand-600)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Actualizar</button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction Modal */}
      {transactionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleTransaction} style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: transactionModal.type === 'purchase' ? '#059669' : '#dc2626' }}>
              {transactionModal.type === 'purchase' ? 'Registrar Compra' : 'Registrar Consumo'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Producto: <strong>{transactionModal.item.name}</strong></p>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Cantidad</span>
              <input required type="number" min="1" max={transactionModal.type === 'usage' ? transactionModal.item.currentQuantity : undefined} value={transactionQty} onChange={e => setTransactionQty(Number(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Notas u Observaciones (Opcional)</span>
              <input type="text" placeholder="Ej: Factura #123, Uso en Cabaña 5..." value={transactionNotes} onChange={e => setTransactionNotes(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-base)' }} />
            </label>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => {setTransactionModal(null); setTransactionQty(1); setTransactionNotes('')}} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-base)', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={updating} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: transactionModal.type === 'purchase' ? '#10b981' : '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Confirmar</button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
