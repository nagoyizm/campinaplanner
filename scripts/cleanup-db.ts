const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("Limpiando organizaciones huérfanas...")

  // La org buena es la que tiene 82 reservas.
  const seededOrg = await prisma.organization.findFirst({
    where: { name: 'Termas del Sur', rooms: { some: {} }, reservations: { some: {} } },
    include: { _count: { select: { reservations: true } } }
  })
  if (!seededOrg) {
    console.log("No se encontró la org buena.")
    return
  }

  // Mover el usuario antiguo admin@termasdelsur.cl a la nueva org
  const oldAdmin = await prisma.user.findUnique({ where: { email: 'admin@termasdelsur.cl' } })
  if (oldAdmin) {
    await prisma.user.update({
      where: { id: oldAdmin.id },
      data: { organizationId: seededOrg.id }
    })
    console.log("Usuario antiguo admin@termasdelsur.cl movido a la nueva Org!")
  }

  // Borrar todas las otras organizaciones que se llamen Termas o Termas del Sur
  const allOrgs = await prisma.organization.findMany({
    where: { id: { not: seededOrg.id } }
  })

  for (const org of allOrgs) {
    // Solo borrar si no tienen reservas ni usuarios (o si es el lodge viejo)
    if (org.name.includes('Termas')) {
      console.log(`Borrando org antigua: ${org.name} (${org.slug})`)
      
      // Borrar Memos
      await prisma.memo.deleteMany({ where: { organizationId: org.id } })
      // Borrar ReservationRooms
      const resvRooms = await prisma.reservationRoom.findMany({ where: { room: { organizationId: org.id } } })
      await prisma.reservationRoom.deleteMany({ where: { id: { in: resvRooms.map(r => r.id) } } })
      // Borrar Reservations
      await prisma.reservation.deleteMany({ where: { organizationId: org.id } })
      // Borrar Rooms
      await prisma.room.deleteMany({ where: { organizationId: org.id } })
      // Borrar Rates
      await prisma.rate.deleteMany({ where: { organizationId: org.id } })
      // Borrar UnitTypes
      await prisma.unitType.deleteMany({ where: { organizationId: org.id } })
      // Borrar Guests
      await prisma.guest.deleteMany({ where: { organizationId: org.id } })
      // Borrar Users
      await prisma.user.deleteMany({ where: { organizationId: org.id } })
      // Borrar Org
      await prisma.organization.delete({ where: { id: org.id } })
    }
  }

  console.log("Limpieza completada.")
}

main().finally(() => prisma.$disconnect())
