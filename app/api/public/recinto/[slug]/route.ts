import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const slug = resolvedParams.slug

    if (!slug) {
      return NextResponse.json({ error: 'Slug de recinto no proporcionado' }, { status: 400 })
    }

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
        }
      }
    })

    if (!org) {
      return NextResponse.json({ error: 'Recinto no encontrado o inactivo' }, { status: 404 })
    }

    return NextResponse.json(org)
  } catch (error: any) {
    console.error('Error fetching public recinto info:', error)
    return NextResponse.json({ error: 'Error al obtener información del recinto' }, { status: 500 })
  }
}
