import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { paymentMethods: true, dteOptions: true, bankAccounts: true }
  })

  return NextResponse.json(org)
}

export async function PUT(req: Request) {
  const { organizationId, role } = await requireOrg()

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  
  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      paymentMethods: body.paymentMethods,
      dteOptions: body.dteOptions,
      bankAccounts: body.bankAccounts,
    },
    select: { paymentMethods: true, dteOptions: true, bankAccounts: true }
  })

  return NextResponse.json(org)
}
