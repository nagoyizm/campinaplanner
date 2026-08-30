import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PublicBookingClient from './PublicBookingClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const org = await prisma.organization.findUnique({
    where: { slug, active: true },
    select: { name: true }
  })

  if (!org) {
    return {
      title: 'Recinto no encontrado | Agendio',
      description: 'El recinto solicitado no existe o no se encuentra disponible.'
    }
  }

  return {
    title: `Reservar en ${org.name} | Agendio`,
    description: `Consulta disponibilidad, cotiza tu estadía y realiza tu reserva online en ${org.name}.`
  }
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params

  const org = await prisma.organization.findUnique({
    where: { slug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      colorPalette: true,
      currency: true,
      paymentMethods: true,
      bankAccounts: true,
      unitTypes: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          maxOccupancy: true,
          sortOrder: true,
          imageUrl: true,
          rooms: {
            where: { active: true },
            select: { id: true, name: true, code: true }
          },
          rates: {
            where: { active: true },
            orderBy: { rackRate: 'asc' },
            select: {
              id: true,
              name: true,
              rackRate: true,
              includedOccupants: true,
              extraPersonAdult: true,
              extraPersonChild: true,
              weekendSurcharge: true,
            }
          }
        }
      },
      seasons: {
        where: { active: true },
        orderBy: [{ startDate: 'asc' }, { priority: 'desc' }],
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          priority: true,
          active: true,
          rates: {
            select: {
              id: true,
              unitTypeId: true,
              rackRate: true,
              extraPersonAdult: true,
              extraPersonChild: true,
              weekendSurcharge: true,
              includedOccupants: true,
            }
          }
        }
      }
    }
  })

  if (!org) {
    notFound()
  }

  const filteredOrg = {
    ...org,
    unitTypes: org.unitTypes.filter(u => u.rooms.length > 0)
  }

  return (
    <PublicBookingClient initialOrg={filteredOrg as any} />
  )
}
