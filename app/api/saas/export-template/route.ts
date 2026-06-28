import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import ExcelJS from 'exceljs'

// Definición de las columnas esperadas por tabla
const TEMPLATES = {
  unittype: [
    { header: 'name', key: 'name', width: 20 },
    { header: 'description', key: 'description', width: 40 },
    { header: 'maxOccupancy', key: 'maxOccupancy', width: 15 },
  ],
  room: [
    { header: 'code', key: 'code', width: 15 },
    { header: 'name', key: 'name', width: 25 },
    { header: 'unitTypeName', key: 'unitTypeName', width: 20 },
  ],
  rate: [
    { header: 'name', key: 'name', width: 25 },
    { header: 'rackRate', key: 'rackRate', width: 15 },
    { header: 'extraPersonAdult', key: 'extraPersonAdult', width: 20 },
    { header: 'extraPersonChild', key: 'extraPersonChild', width: 20 },
  ],
  guest: [
    { header: 'firstName', key: 'firstName', width: 20 },
    { header: 'lastName', key: 'lastName', width: 20 },
    { header: 'rut', key: 'rut', width: 15 },
    { header: 'email', key: 'email', width: 25 },
    { header: 'phone', key: 'phone', width: 15 },
    { header: 'nationality', key: 'nationality', width: 15 },
  ],
  reservation: [
    { header: 'guestRut', key: 'guestRut', width: 15 },
    { header: 'roomCode', key: 'roomCode', width: 15 },
    { header: 'arrival', key: 'arrival', width: 15 }, // YYYY-MM-DD
    { header: 'departure', key: 'departure', width: 15 }, // YYYY-MM-DD
    { header: 'adults', key: 'adults', width: 10 },
    { header: 'children', key: 'children', width: 10 },
    { header: 'status', key: 'status', width: 15 }, // booked, confirmed, checked_in
    { header: 'totalPaid', key: 'totalPaid', width: 15 },
  ],
  inventario: [
    { header: 'name', key: 'name', width: 30 },
    { header: 'category', key: 'category', width: 25 },
    { header: 'unitCost', key: 'unitCost', width: 15 },
    { header: 'currentQuantity', key: 'currentQuantity', width: 15 },
    { header: 'minQuantity', key: 'minQuantity', width: 15 },
  ]
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table') as keyof typeof TEMPLATES

    if (!table || !TEMPLATES[table]) {
      return NextResponse.json({ error: 'Tabla no válida' }, { status: 400 })
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Habita SaaS'
    const worksheet = workbook.addWorksheet(table.toUpperCase())

    // Configurar columnas
    worksheet.columns = TEMPLATES[table]

    // Dar estilo al header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Agregar una fila de ejemplo como guía (comentada en la práctica, o simplemente datos de ejemplo)
    if (table === 'room') {
      worksheet.addRow({ code: 'C1', name: 'Cabaña 1', unitTypeName: 'Cabaña 5P' })
    } else if (table === 'reservation') {
      worksheet.addRow({ guestRut: '12345678-9', roomCode: 'C1', arrival: '2026-07-01', departure: '2026-07-05', adults: 2, children: 0, status: 'confirmed', totalPaid: 150000 })
    } else if (table === 'inventario') {
      worksheet.addRow({ name: 'Papel Higiénico', category: 'Amenidades', unitCost: 350, currentQuantity: 100, minQuantity: 20 })
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="plantilla_${table}.xlsx"`
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
