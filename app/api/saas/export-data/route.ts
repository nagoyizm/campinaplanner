import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const table = searchParams.get('table')
  const format = searchParams.get('format') || 'csv'

  if (!orgId || !table) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  let data: any[] = []
  
  if (table === 'unittype') {
    data = await prisma.unitType.findMany({ where: { organizationId: orgId } })
  } else if (table === 'room') {
    data = await prisma.room.findMany({ where: { organizationId: orgId } })
  } else if (table === 'rate') {
    data = await prisma.rate.findMany({ where: { organizationId: orgId } })
  } else if (table === 'guest') {
    data = await prisma.guest.findMany({ where: { organizationId: orgId } })
  } else if (table === 'reservation') {
    data = await prisma.reservation.findMany({ 
      where: { organizationId: orgId },
      include: { rooms: true } 
    })
  }

  if (format === 'csv') {
    if (data.length === 0) {
      return new NextResponse('No hay datos exportables en esta tabla.', { status: 200 })
    }
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        let val = row[fieldName]
        val ??= ''
        if (typeof val === 'object') val = JSON.stringify(val)
        // Escapar comillas dobles y comas para CSV
        return `"${String(val).replaceAll('"', '""')}"`
      }).join(','))
    ]
    const csvContent = csvRows.join('\n')
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${table}_export.csv"`
      }
    })
  }

  // Si format === 'json'
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${table}_export.json"`
    }
  })
}
