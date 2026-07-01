import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const { organizationId, name: orgName } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  const where: any = { organizationId }
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { rut: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ]
  }

  const guests = await prisma.guest.findMany({
    where,
    orderBy: { lastName: 'asc' },
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = orgName || 'Campina Planner'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Base de Huéspedes', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })

  // Title
  sheet.mergeCells('A1:J1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = `Base de Huéspedes — ${orgName || 'Mi Organización'} ${q ? `(Filtro: "${q}")` : ''}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A2E1E' } }
  titleCell.alignment = { horizontal: 'center' }
  sheet.getRow(1).height = 25

  // Headers
  const headers = [
    'Nombre', 'Apellido', 'RUT/ID', 'Email', 'Teléfono',
    'Nacionalidad', 'Dirección', 'Total Estadías', 'Notas', 'Fecha Registro'
  ]
  const headerRow = sheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2E1E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  sheet.getRow(2).height = 20

  // Data rows
  let rowIdx = 3
  for (const g of guests) {
    const row = sheet.addRow([
      g.firstName,
      g.lastName,
      g.rut || '—',
      g.email || '—',
      g.phone || '—',
      g.nationality || '—',
      g.address || '—',
      g.totalStays,
      g.notes || '—',
      format(new Date(g.createdAt), 'dd/MM/yyyy')
    ])

    // Alternate row colors
    if (rowIdx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F1' } }
      })
    }

    rowIdx++
  }

  // Column widths
  const colWidths = [15, 15, 14, 25, 15, 15, 25, 12, 30, 15]
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=base-huespedes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    },
  })
}
