import { prisma } from '@/lib/prisma'
import CalendarioClient from './CalendarioClient'
import { addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

function getTodayInSantiago(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const fechaBaseStr = params.fecha || getTodayInSantiago()

  const [year, month] = fechaBaseStr.split('-').map(Number)
  const inicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const lastDayVal = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const fin = new Date(Date.UTC(year, month - 1, lastDayVal, 23, 59, 59, 999))

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
      fechaBase={fechaBaseStr}
    />
  )
}
