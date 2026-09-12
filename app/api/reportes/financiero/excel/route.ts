import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

const STATUS_LABELS: Record<string, string> = {
  booked: 'Reservado', confirmed: 'Confirmado', checked_in: 'Check-In',
  checked_out: 'Check-Out', blocked: 'Bloqueado', cancelled: 'Cancelado', no_show: 'No Show',
}

function fmtDate(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dateVal = String(d.getUTCDate()).padStart(2, '0')
  return `${dateVal}/${m}/${y}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const queryBy = searchParams.get('queryBy') || 'arrival'
  const rawUnitTypeIds = searchParams.get('unitTypeIds') || searchParams.get('unitTypeId') || 'all'
  const unitTypeIds = rawUnitTypeIds === 'all' || !rawUnitTypeIds.trim() ? [] : rawUnitTypeIds.split(',').map(s => s.trim()).filter(Boolean)

  const rawRoomIds = searchParams.get('roomIds') || searchParams.get('roomId') || 'all'
  const roomIds = rawRoomIds === 'all' || !rawRoomIds.trim() ? [] : rawRoomIds.split(',').map(s => s.trim()).filter(Boolean)

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  let where: any = {}
  if (queryBy === 'arrival') where = { arrival: { gte: start, lte: end } }
  else if (queryBy === 'departure') where = { departure: { gte: start, lte: end } }
  else where = { OR: [{ arrival: { gte: start, lte: end } }, { departure: { gte: start, lte: end } }] }

  const roomFilter: any = {}
  if (roomIds.length === 1 && roomIds[0] !== 'all') {
    roomFilter.id = roomIds[0]
  } else if (roomIds.length > 1) {
    roomFilter.id = { in: roomIds }
  } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
    roomFilter.unitTypeId = unitTypeIds[0]
  } else if (unitTypeIds.length > 1) {
    roomFilter.unitTypeId = { in: unitTypeIds }
  }

  if (Object.keys(roomFilter).length > 0) {
    where.room = roomFilter
  }

  const rows = await prisma.reservationRoom.findMany({
    where,
    include: { 
      reservation: { 
        include: { 
          guest: true,
          rooms: { select: { id: true, unitTotal: true } }
        } 
      }, 
      room: true, 
      rate: true 
    },
    orderBy: { arrival: 'asc' },
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cabañas La Campiña'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Reporte Financiero', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })

  // Title
  sheet.mergeCells('A1:P1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = `Reporte Financiero — Cabañas La Campiña — ${fmtDate(start)} al ${fmtDate(end)}`
  titleCell.font = { bold: true, size: 13, color: { argb: 'FF1A2E1E' } }
  titleCell.alignment = { horizontal: 'center' }
  sheet.getRow(1).height = 22

  // Headers
  const headers = [
    'Rsv #', 'Nombre', 'Apellido', 'Habitación', 'Tipo', 'Tarifa',
    'Llegada', 'Salida', 'Noches', 'Total Hab.', 'Descuentos',
    'Serv. Adic.', 'Impuesto', 'Total', 'Pagado', 'Adeudado',
    'Estado', 'Forma de Pago',
  ]
  const headerRow = sheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2E1E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF2D7D46' } } }
  })
  sheet.getRow(2).height = 18

  // Data rows
  let totals = { unitTotal: 0, discounts: 0, additionalServices: 0, tax: 0, total: 0, totalPaid: 0, amountDue: 0 }
  let rowIdx = 3

  for (const r of rows) {
    const rsv = r.reservation
    const rsvTotal = rsv.unitTotal + rsv.additionalServices - rsv.discounts + rsv.tax
    const isMultiRoom = (rsv.rooms?.length || 1) > 1

    const ratio = (rsv.unitTotal > 0 && rsv.rooms?.length > 1)
      ? (r.unitTotal / rsv.unitTotal)
      : (1 / (rsv.rooms?.length || 1))

    const roomDiscounts = isMultiRoom ? Math.round(rsv.discounts * ratio) : rsv.discounts
    const roomAdditionalServices = isMultiRoom ? Math.round(rsv.additionalServices * ratio) : rsv.additionalServices
    const roomTax = isMultiRoom ? Math.round(rsv.tax * ratio) : rsv.tax
    const roomTotal = isMultiRoom 
      ? Math.round(r.unitTotal + roomAdditionalServices - roomDiscounts + roomTax)
      : rsvTotal
    const roomPaid = isMultiRoom ? Math.round(rsv.totalPaid * ratio) : rsv.totalPaid
    const roomAmountDue = roomTotal - roomPaid

    totals.unitTotal += r.unitTotal
    totals.discounts += roomDiscounts
    totals.additionalServices += roomAdditionalServices
    totals.tax += roomTax
    totals.total += roomTotal
    totals.totalPaid += roomPaid
    totals.amountDue += roomAmountDue

    const row = sheet.addRow([
      rsv.id, rsv.guest.firstName, rsv.guest.lastName,
      r.room.name.replace(/^[a-z]-/i, ''), r.room.code,
      r.rate?.name ?? '—',
      new Date(r.arrival.getUTCFullYear(), r.arrival.getUTCMonth(), r.arrival.getUTCDate()),
      new Date(r.departure.getUTCFullYear(), r.departure.getUTCMonth(), r.departure.getUTCDate()),
      r.nights,
      r.unitTotal, roomDiscounts, roomAdditionalServices, roomTax,
      roomTotal, roomPaid, roomAmountDue,
      STATUS_LABELS[rsv.status] ?? rsv.status,
      rsv.paymentMethod ?? '—',
    ])

    // Alternate row colors
    if (rowIdx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F1' } }
      })
    }

    // Date format
    const arrCell = row.getCell(7)
    const depCell = row.getCell(8)
    arrCell.numFmt = 'dd/mm/yyyy'
    depCell.numFmt = 'dd/mm/yyyy'

    // Currency format for numeric columns
    ;[10, 11, 12, 13, 14, 15, 16].forEach((col) => {
      row.getCell(col).numFmt = '#,##0'
      row.getCell(col).alignment = { horizontal: 'right' }
    })

    rowIdx++
  }

  // Totals row
  const totalsRow = sheet.addRow([
    '', 'TOTALES', '', '', '', '', '', '', '',
    totals.unitTotal, totals.discounts, totals.additionalServices,
    totals.tax, totals.total, totals.totalPaid, totals.amountDue, '', '',
  ])
  totalsRow.eachCell((cell, col) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EAD9' } }
    if (col >= 10 && col <= 16) {
      cell.numFmt = '#,##0'
      cell.alignment = { horizontal: 'right' }
    }
  })

  // Column widths
  const colWidths = [7, 14, 14, 18, 6, 22, 12, 12, 7, 12, 12, 12, 10, 12, 12, 12, 14, 14]
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=reporte-financiero-${startDate}-${endDate}.xlsx`,
    },
  })
}
