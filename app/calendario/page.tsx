import { prisma } from '@/lib/prisma'
import CalendarioClient from './CalendarioClient'
import { startOfMonth, endOfMonth, addDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const fechaBase = params.fecha ? new Date(params.fecha) : new Date()
  const inicio = startOfMonth(fechaBase)
  const fin = endOfMonth(fechaBase)

  // Cargar rooms con su tipo de unidad
  const rooms = await prisma.room.findMany({
    where: { active: true },
    include: { unitType: true },
    orderBy: { sortOrder: 'asc' },
  })

  // Cargar reservas del mes (con margen de ±7 días)
  const reservas = await prisma.reservationRoom.findMany({
    where: {
      OR: [
        { arrival: { lte: addDays(fin, 7), gte: addDays(inicio, -7) } },
        { departure: { lte: addDays(fin, 7), gte: addDays(inicio, -7) } },
      ],
    },
    include: {
      reservation: {
        include: { guest: true },
      },
      rate: true,
      room: true,
    },
  })

  const mappedReservas = reservas.map((r) => ({
    ...r,
    arrival: r.arrival.toISOString(),
    departure: r.departure.toISOString(),
  }))

  return (
    <CalendarioClient
      rooms={rooms}
      reservas={mappedReservas as any}
      fechaBase={fechaBase.toISOString()}
    />
  )
}
