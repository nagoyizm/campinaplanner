import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function deleteOrg(org: any) {
  console.log(`Borrando org fantasma: ${org.name} (${org.slug})`)
  try {
    const orgId = org.id
    await prisma.memo.deleteMany({ where: { organizationId: orgId } })
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } })
    await prisma.saasPayment.deleteMany({ where: { organizationId: orgId } })
    await prisma.payment.deleteMany({ where: { reservation: { organizationId: orgId } } })
    await prisma.extra.deleteMany({ where: { reservation: { organizationId: orgId } } })
    
    const resvRooms = await prisma.reservationRoom.findMany({ where: { room: { organizationId: orgId } } })
    if (resvRooms.length > 0) {
      await prisma.reservationRoom.deleteMany({ where: { id: { in: resvRooms.map((r: any) => r.id) } } })
    }
    
    await prisma.reservation.deleteMany({ where: { organizationId: orgId } })
    await prisma.rate.deleteMany({ where: { organizationId: orgId } })
    await prisma.room.deleteMany({ where: { organizationId: orgId } })
    await prisma.amenity.deleteMany({ where: { organizationId: orgId } })
    await prisma.unitType.deleteMany({ where: { organizationId: orgId } })
    await prisma.guest.deleteMany({ where: { organizationId: orgId } })
    await prisma.user.deleteMany({ where: { organizationId: orgId } })
    
    await prisma.organization.delete({ where: { id: orgId } })
    console.log(`✅ ${org.slug} borrado con éxito.`)
  } catch (error: any) {
    console.error(`❌ Error al borrar ${org.slug}:`, error.message)
  }
}

async function main() {
  console.log("Iniciando purga de organizaciones fantasma...")

  const allOrgs = await prisma.organization.findMany({
    include: { _count: { select: { reservations: true } } }
  })

  // Filtramos por orgs sin reservas
  const ghostOrgs = allOrgs.filter((org: any) => org.name.includes('Termas') && org._count.reservations === 0)

  for (const org of ghostOrgs) {
    await deleteOrg(org)
  }

  console.log("Limpieza terminada.")
}

main().finally(() => prisma.$disconnect())

export {}
