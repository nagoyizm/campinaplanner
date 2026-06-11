'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  Loader2, 
  CheckCircle,
  Clock,
  HelpCircle,
  Filter,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import ReservaModal from '@/components/reservas/ReservaModal'
import { format } from 'date-fns'
import styles from './reservas.module.css'

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
}

interface Room {
  id: string
  code: string
  name: string
}

interface ReservationRoom {
  id: string
  roomId: string
  arrival: string
  departure: string
  nights: number
  room: Room
}

interface Reservation {
  id: number
  status: string
  guest: Guest
  rooms: ReservationRoom[]
  unitTotal: number
  additionalServices: number
  discounts: number
  tax: number
  totalPaid: number
  createdAt: string
}

export default function ReservasPage() {
  const router = useRouter()
  const [reservas, setReservas] = useState<Reservation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1) // Reset to first page on search
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch reservations
  const fetchReservas = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/reservas', window.location.origin)
      url.searchParams.append('page', page.toString())
      url.searchParams.append('limit', limit.toString())
      if (statusFilter) url.searchParams.append('status', statusFilter)
      if (debouncedQuery) url.searchParams.append('q', debouncedQuery)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Error al obtener reservas')
      const data = await res.json()
      setReservas(data.reservas)
      setTotal(data.total)
    } catch (err: any) {
      toast.error('No se pudieron cargar las reservas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservas()
  }, [page, statusFilter, debouncedQuery])

  const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val)
  }

  const formatUTCDateString = (dateStr: string) => {
    if (!dateStr) return '—'
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length !== 3) return '—'
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const getReservationDates = (rsv: Reservation) => {
    if (!rsv.rooms || rsv.rooms.length === 0) return { arrival: '—', departure: '—', nights: 0 }
    
    // Sort room lines to find first arrival and last departure (alphabetic sort works chronologically for YYYY-MM-DD)
    const sorted = [...rsv.rooms].sort((a, b) => a.arrival.localeCompare(b.arrival))
    const arrivalStr = sorted[0].arrival
    const departureStr = sorted[sorted.length - 1].departure
    const nights = sorted.reduce((sum, r) => sum + r.nights, 0)
    
    return {
      arrival: formatUTCDateString(arrivalStr),
      departure: formatUTCDateString(departureStr),
      nights
    }
  }

  const handleOpenEdit = (id: number) => {
    setSelectedReservaId(id)
    setModalOpen(true)
  }

  const handleOpenNew = () => {
    setSelectedReservaId(null)
    setModalOpen(true)
  }

  const handleModalSave = () => {
    setModalOpen(false)
    fetchReservas()
  }

  const statusLabels: Record<string, string> = {
    booked: 'Reservado',
    confirmed: 'Confirmado',
    checked_in: 'En Recinto',
    checked_out: 'Finalizado',
    blocked: 'Bloqueado',
    cancelled: 'Cancelado',
    no_show: 'No Show'
  }

  const statusColors: Record<string, string> = {
    booked: styles.statusBooked,
    confirmed: styles.statusConfirmed,
    checked_in: styles.statusCheckedIn,
    checked_out: styles.statusCheckedOut,
    blocked: styles.statusBlocked,
    cancelled: styles.statusCancelled,
    no_show: styles.statusNoShow
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Listado de Reservas</h1>
          <p className="page-subtitle">Gestione y filtre todos los registros de reservas del recinto</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Nueva Reserva
        </button>
      </div>

      {/* Filters Bar Card */}
      <div className={`card ${styles.filtersCard}`}>
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search box */}
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o apellido de huésped..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`input ${styles.searchInput}`}
            />
            {searchQuery && (
              <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Status filter dropdown */}
          <div className={styles.filterGroup}>
            <Filter size={16} className={styles.filterLabelIcon} />
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="select"
              style={{ minWidth: 160 }}
            >
              <option value="">Todos los Estados</option>
              <option value="booked">Reservado</option>
              <option value="confirmed">Confirmado</option>
              <option value="checked_in">En Recinto (Check-In)</option>
              <option value="checked_out">Finalizado (Check-Out)</option>
              <option value="cancelled">Cancelado</option>
              <option value="no_show">No Show</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>

          {/* Counter */}
          <div className={styles.resultsCount}>
            <span>{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader2 size={32} className={styles.spinner} />
              <p>Cargando listado de reservas...</p>
            </div>
          ) : reservas.length === 0 ? (
            <div className={styles.emptyContainer}>
              <Calendar size={48} className={styles.emptyIcon} />
              <h3>No se encontraron reservas</h3>
              <p>Pruebe cambiando los términos de búsqueda o filtros aplicados.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter(''); }} style={{ marginTop: 12 }}>
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rsv #</th>
                    <th>Huésped</th>
                    <th>Cabañas / Suites</th>
                    <th>Llegada</th>
                    <th>Salida</th>
                    <th style={{ textAlign: 'center' }}>Noches</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Pagado</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((rsv) => {
                    const { arrival, departure, nights } = getReservationDates(rsv)
                    const totalCost = rsv.unitTotal + rsv.additionalServices - rsv.discounts + rsv.tax
                    const amountDue = totalCost - rsv.totalPaid
                    const roomCodes = rsv.rooms.map(roomLine => roomLine.room?.code).filter(Boolean).join(', ') || '—'
                    
                    return (
                      <tr key={rsv.id}>
                        <td className={styles.boldCell} style={{ color: 'var(--brand-500)' }}>
                          #{rsv.id}
                        </td>
                        <td className={styles.boldCell}>
                          {rsv.guest.firstName} {rsv.guest.lastName}
                        </td>
                        <td>
                          <span className={styles.roomCodesBadge}>{roomCodes}</span>
                        </td>
                        <td>{arrival}</td>
                        <td>{departure}</td>
                        <td style={{ textAlign: 'center' }}>{nights}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCLP(totalCost)}</td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 500 }}>{formatCLP(rsv.totalPaid)}</td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: 700, 
                          color: amountDue > 0 ? '#ef4444' : '#10b981' 
                        }}>
                          {amountDue > 0 ? formatCLP(amountDue) : 'Al día'}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusColors[rsv.status]}`}>
                            {statusLabels[rsv.status] ?? rsv.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {format(new Date(rsv.createdAt), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleOpenEdit(rsv.id)}
                              style={{ padding: '6px', height: 'auto' }}
                              title="Editar/Ver Reserva"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Table Footer / Pagination */}
        {totalPages > 1 && !loading && (
          <div className={styles.pagination}>
            <button 
              className="btn btn-ghost btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {page} de {totalPages}
            </span>
            <button 
              className="btn btn-ghost btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Reservation Modal (Fase 4 component reused) */}
      {modalOpen && (
        <ReservaModal 
          reservaId={selectedReservaId}
          onClose={() => setModalOpen(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}
