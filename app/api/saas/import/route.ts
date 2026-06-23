import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { parse } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const formData = await req.formData() as any
    const file = formData.get('file') as File
    const orgId = formData.get('orgId') as string
    const table = formData.get('table') as string

    if (!file || !orgId || !table) {
      return NextResponse.json({ error: 'Faltan parámetros (file, orgId, table)' }, { status: 400 })
    }

    // Asegurarse de que el orgId exista
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    // Leer el archivo Excel
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: 'El archivo Excel está vacío' }, { status: 400 })
    }

    // Parsear a JSON
    const rows: any[] = []
    const headers: string[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value?.toString() || ''
        })
      } else {
        // Datos
        const rowData: any = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber]
          if (header) {
            rowData[header] = cell.value
          }
        })
        if (Object.keys(rowData).length > 0) {
          rows.push(rowData)
        }
      }
    })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos en el archivo' }, { status: 400 })
    }

    let insertCount = 0

    // Procesar según la tabla
    await prisma.$transaction(async (tx) => {
      if (table === 'unittype') {
        for (const row of rows) {
          if (!row.name) continue
          await tx.unitType.create({
            data: {
              organizationId: orgId,
              name: row.name.toString(),
              description: row.description?.toString() || '',
              maxOccupancy: parseInt(row.maxOccupancy?.toString() || '2', 10)
            }
          })
          insertCount++
        }
      } 
      
      else if (table === 'room') {
        for (const row of rows) {
          if (!row.code || !row.name || !row.unitTypeName) continue
          // Buscar unit type
          const unitType = await tx.unitType.findFirst({
            where: { organizationId: orgId, name: row.unitTypeName.toString() }
          })
          if (!unitType) throw new Error(`UnitType no encontrado: ${row.unitTypeName}`)

          await tx.room.create({
            data: {
              organizationId: orgId,
              code: row.code.toString(),
              name: row.name.toString(),
              unitTypeId: unitType.id
            }
          })
          insertCount++
        }
      }

      else if (table === 'guest') {
        for (const row of rows) {
          if (!row.firstName || !row.lastName) continue
          await tx.guest.create({
            data: {
              organizationId: orgId,
              firstName: row.firstName.toString(),
              lastName: row.lastName.toString(),
              rut: row.rut?.toString() || null,
              email: row.email?.toString() || null,
              phone: row.phone?.toString() || null,
              nationality: row.nationality?.toString() || 'Chile'
            }
          })
          insertCount++
        }
      }

      else if (table === 'reservation') {
        for (const row of rows) {
          if (!row.guestRut || !row.roomCode || !row.arrival || !row.departure) continue
          
          // Buscar huésped
          const guest = await tx.guest.findFirst({
            where: { organizationId: orgId, rut: row.guestRut.toString() }
          })
          if (!guest) throw new Error(`Huésped no encontrado con RUT: ${row.guestRut}`)

          // Buscar habitación
          const room = await tx.room.findUnique({
            where: { code_organizationId: { code: row.roomCode.toString(), organizationId: orgId } }
          })
          if (!room) throw new Error(`Habitación no encontrada con Código: ${row.roomCode}`)

          // Parse Dates. ExcelJS might return actual Date objects or strings.
          let arrivalDate, departureDate
          if (row.arrival instanceof Date) arrivalDate = row.arrival
          else arrivalDate = new Date(row.arrival.toString())

          if (row.departure instanceof Date) departureDate = row.departure
          else departureDate = new Date(row.departure.toString())

          // Crear reserva principal
          const reservation = await tx.reservation.create({
            data: {
              organizationId: orgId,
              guestId: guest.id,
              status: row.status?.toString() || 'confirmed',
              adults: parseInt(row.adults?.toString() || '2', 10),
              children: parseInt(row.children?.toString() || '0', 10),
              totalPaid: parseFloat(row.totalPaid?.toString() || '0')
            }
          })

          // Crear ReservationRoom link
          await tx.reservationRoom.create({
            data: {
              reservationId: reservation.id,
              roomId: room.id,
              arrival: arrivalDate,
              departure: departureDate,
              adults: reservation.adults,
              children: reservation.children
            }
          })
          insertCount++
        }
      } else if (table === 'inventario') {
        for (const row of rows) {
          if (!row.name || !row.category) continue
          await tx.inventoryItem.create({
            data: {
              organizationId: orgId,
              name: row.name.toString(),
              category: row.category.toString(),
              unitCost: parseFloat(row.unitCost?.toString() || '0'),
              currentQuantity: parseInt(row.currentQuantity?.toString() || '0', 10),
              minQuantity: parseInt(row.minQuantity?.toString() || '0', 10),
              active: true
            }
          })
          insertCount++
        }
      } else {
        throw new Error('Tabla no soportada para importación')
      }
    })

    return NextResponse.json({ success: true, count: insertCount })

  } catch (error: any) {
    console.error('Import Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno durante la importación' }, { status: 500 })
  }
}
