import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

const VALID_PALETTES = new Set(['verde', 'azul', 'rojizo', 'crema', 'morado', 'turquesa'])

export async function GET() {
  const { organizationId } = await requireOrg()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { colorPalette: true, name: true },
  })
  return NextResponse.json(org)
}

export async function PATCH(req: Request) {
  const { organizationId, role } = await requireOrg()
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { colorPalette } = await req.json()
  if (!VALID_PALETTES.has(colorPalette)) {
    return NextResponse.json({ error: 'Paleta inválida' }, { status: 400 })
  }

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { colorPalette },
    select: { colorPalette: true },
  })
  return NextResponse.json(org)
}
