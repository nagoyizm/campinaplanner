import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { format, differenceInCalendarMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  booked: 'Reservado',
  confirmed: 'Confirmado',
  checked_in: 'Check-In',
  checked_out: 'Check-Out',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
  no_show: 'No Show',
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dateVal = String(dt.getUTCDate()).padStart(2, '0')
  return `${dateVal}/${m}/${y}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dateType = searchParams.get('dateType') || 'arrival'
    const rawUnitTypeIds = searchParams.get('unitTypeIds') || searchParams.get('unitTypeId') || 'all'
    const unitTypeIds = rawUnitTypeIds === 'all' || !rawUnitTypeIds.trim() ? [] : rawUnitTypeIds.split(',').map(s => s.trim()).filter(Boolean)
    const rawRoomIds = searchParams.get('roomIds') || searchParams.get('roomId') || 'all'
    const roomIds = rawRoomIds === 'all' || !rawRoomIds.trim() ? [] : rawRoomIds.split(',').map(s => s.trim()).filter(Boolean)
    const statusFilter = searchParams.get('status') || 'active'

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 })
    }

    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T23:59:59.999Z`)

    const where: any = {}
    if (statusFilter === 'active') {
      where.status = { in: ['booked', 'confirmed', 'checked_in', 'checked_out'] }
    } else if (statusFilter !== 'all') {
      where.status = statusFilter
    }

    if (dateType === 'created') {
      where.createdAt = { gte: start, lte: end }
      if (roomIds.length === 1 && roomIds[0] !== 'all') {
        where.rooms = { some: { roomId: roomIds[0] } }
      } else if (roomIds.length > 1) {
        where.rooms = { some: { roomId: { in: roomIds } } }
      } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
        where.rooms = { some: { room: { unitTypeId: unitTypeIds[0] } } }
      } else if (unitTypeIds.length > 1) {
        where.rooms = { some: { room: { unitTypeId: { in: unitTypeIds } } } }
      }
    } else {
      const roomDateCondition: any = {}
      if (dateType === 'arrival') {
        roomDateCondition.arrival = { gte: start, lte: end }
      } else {
        roomDateCondition.OR = [
          { arrival: { gte: start, lte: end } },
          { departure: { gte: start, lte: end } },
        ]
      }
      if (roomIds.length === 1 && roomIds[0] !== 'all') {
        roomDateCondition.roomId = roomIds[0]
      } else if (roomIds.length > 1) {
        roomDateCondition.roomId = { in: roomIds }
      } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
        roomDateCondition.room = { unitTypeId: unitTypeIds[0] }
      } else if (unitTypeIds.length > 1) {
        roomDateCondition.room = { unitTypeId: { in: unitTypeIds } }
      }

      where.rooms = { some: roomDateCondition }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        guest: true,
        rooms: {
          include: {
            room: { include: { unitType: true } },
            rate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const pStart = parseISO(startDate)
    const pEnd = parseISO(endDate)
    const monthsCount = Math.max(1, differenceInCalendarMonths(pEnd, pStart) + 1)
    const totalReservations = reservations.length
    const totalPacks = totalReservations
    const monthlyAverageReservations = Number((totalReservations / monthsCount).toFixed(1))

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Cabañas La Campiña'
    workbook.created = new Date()

    // ──────────────── SHEET 1: Listado de Reservas ────────────────
    const sheet1 = workbook.addWorksheet('Listado de Reservas', {
      pageSetup: { orientation: 'landscape', fitToPage: true },
    })

    sheet1.mergeCells('A1:L1')
    const titleCell = sheet1.getCell('A1')
    titleCell.value = 'REPORTE DE RESERVAS Y CONSUMO DE INVENTARIO'
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet1.getRow(1).height = 30

    // Metadata & KPIs in header
    sheet1.mergeCells('A2:L2')
    sheet1.getCell('A2').value = `Período: ${fmtDate(startDate)} al ${fmtDate(endDate)} (${monthsCount} meses) | Generado: ${new Date().toLocaleDateString('es-CL')}`
    sheet1.getCell('A2').font = { name: 'Arial', size: 10, italic: true }
    sheet1.getCell('A2').alignment = { horizontal: 'center' }

    sheet1.mergeCells('A3:L3')
    sheet1.getCell('A3').value = `KPIs Clave: Total Reservas = ${totalReservations} | Promedio Mensual = ${monthlyAverageReservations} rsv/mes | Packs Amenities Requeridos (1 por reserva) = ${totalPacks}`
    sheet1.getCell('A3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF065F46' } }
    sheet1.getCell('A3').alignment = { horizontal: 'center' }

    const headers1 = [
      'Rsv #',
      'Huésped',
      'Teléfono / Email',
      'Cabaña(s)',
      'Tipo de Unidad',
      'Llegada',
      'Salida',
      'Noches',
      'Adultos',
      'Niños',
      'Packs Insumos (1/rsv)',
      'Estado',
    ]

    const headerRow1 = sheet1.addRow(headers1)
    headerRow1.height = 24
    headerRow1.eachCell(cell => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    reservations.forEach(rsv => {
      const cabins = rsv.rooms.map(rm => rm.room?.name || rm.room?.code || '').join(', ')
      const unitTypes = Array.from(new Set(rsv.rooms.map(rm => rm.room?.unitType?.name).filter(Boolean))).join(', ')
      const earliestArrival = rsv.rooms.length > 0
        ? rsv.rooms.reduce((min, rm) => (rm.arrival < min ? rm.arrival : min), rsv.rooms[0].arrival)
        : rsv.createdAt
      const latestDeparture = rsv.rooms.length > 0
        ? rsv.rooms.reduce((max, rm) => (rm.departure > max ? rm.departure : max), rsv.rooms[0].departure)
        : rsv.createdAt
      const nights = rsv.rooms.reduce((acc, rm) => acc + (rm.nights || 0), 0)

      const row = sheet1.addRow([
        `#${rsv.id}`,
        `${rsv.guest?.firstName || ''} ${rsv.guest?.lastName || ''}`.trim(),
        rsv.guest?.phone || rsv.guest?.email || '—',
        cabins,
        unitTypes,
        fmtDate(earliestArrival),
        fmtDate(latestDeparture),
        nights,
        rsv.adults,
        rsv.children,
        1, // 1 pack per reservation
        STATUS_LABELS[rsv.status] || rsv.status,
      ])

      row.height = 20
      row.getCell(1).alignment = { horizontal: 'center' }
      row.getCell(6).alignment = { horizontal: 'center' }
      row.getCell(7).alignment = { horizontal: 'center' }
      row.getCell(8).alignment = { horizontal: 'right' }
      row.getCell(9).alignment = { horizontal: 'right' }
      row.getCell(10).alignment = { horizontal: 'right' }
      row.getCell(11).alignment = { horizontal: 'center' }
      row.getCell(12).alignment = { horizontal: 'center' }
    })

    sheet1.columns = [
      { width: 10 }, // Rsv #
      { width: 25 }, // Huésped
      { width: 22 }, // Teléfono / Email
      { width: 20 }, // Cabaña(s)
      { width: 22 }, // Tipo
      { width: 13 }, // Llegada
      { width: 13 }, // Salida
      { width: 10 }, // Noches
      { width: 10 }, // Adultos
      { width: 10 }, // Niños
      { width: 20 }, // Packs Insumos
      { width: 14 }, // Estado
    ]

    // ──────────────── SHEET 2: Desglose Mensual ────────────────
    const sheet2 = workbook.addWorksheet('Desglose Mensual')
    sheet2.mergeCells('A1:F1')
    sheet2.getCell('A1').value = 'PROMEDIO Y DISTRIBUCIÓN MENSUAL'
    sheet2.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
    sheet2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }
    sheet2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
    sheet2.getRow(1).height = 28

    const headers2 = ['Mes / Año', 'Cantidad de Reservas', 'Packs Amenities (1/rsv)', 'Noches Totales', 'Pasajeros (PAX)', 'Promedio Noches/Rsv']
    const headerRow2 = sheet2.addRow(headers2)
    headerRow2.height = 22
    headerRow2.eachCell(cell => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Grouping for sheet 2
    const monthMap = new Map<string, { label: string; reservations: Set<number>; nights: number; pax: number }>()
    reservations.forEach(rsv => {
      const arr = rsv.rooms.length > 0 ? rsv.rooms[0].arrival : rsv.createdAt
      const key = format(arr, 'yyyy-MM')
      const label = format(arr, "MMMM 'de' yyyy", { locale: es })
      if (!monthMap.has(key)) {
        monthMap.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), reservations: new Set(), nights: 0, pax: 0 })
      }
      const m = monthMap.get(key)!
      m.reservations.add(rsv.id)
      m.nights += rsv.rooms.reduce((acc, rm) => acc + (rm.nights || 0), 0)
      m.pax += (rsv.adults || 0) + (rsv.children || 0)
    })

    Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([_, m]) => {
      const rsvCount = m.reservations.size
      const avgNights = rsvCount > 0 ? (m.nights / rsvCount).toFixed(1) : '0'
      const row = sheet2.addRow([m.label, rsvCount, rsvCount, m.nights, m.pax, avgNights])
      row.height = 20
      row.getCell(2).alignment = { horizontal: 'right' }
      row.getCell(3).alignment = { horizontal: 'right' }
      row.getCell(4).alignment = { horizontal: 'right' }
      row.getCell(5).alignment = { horizontal: 'right' }
      row.getCell(6).alignment = { horizontal: 'right' }
    })

    sheet2.columns = [
      { width: 22 },
      { width: 22 },
      { width: 24 },
      { width: 16 },
      { width: 16 },
      { width: 22 },
    ]

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte_reservas_${startDate}_${endDate}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating reservations excel:', error)
    return NextResponse.json({ error: error.message || 'Error exportando excel' }, { status: 500 })
  }
}
