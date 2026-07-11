const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

// Configuración de fechas para generar datos orgánicos
const TODAY = new Date()
const START_DATE = new Date(TODAY.getFullYear(), 0, 1) // Principio de año
const END_DATE = new Date(TODAY.getFullYear(), TODAY.getMonth() + 2, 0) // Dos meses hacia el futuro

async function main() {
  console.log('Iniciando carga de datos para "Termas del Sur"...')

  // Limpieza de usuarios anteriores si falló el script a medias
  await prisma.user.deleteMany({
    where: { email: { in: ['admin@termas.cl', 'recepcion@termas.cl', 'empleado@termas.cl'] } }
  })

  // 1. Crear Organización
  const orgSlug = `termas-${Date.now()}`
  const org = await prisma.organization.create({
    data: {
      name: 'Termas del Sur',
      slug: orgSlug,
    }
  })
  const orgId = org.id
  console.log('✔ Organización Termas del Sur creada.')

  // 2. Crear Usuarios (Admin, Recepción, Empleado)
  const hashedSuperPassword = await bcrypt.hash(process.env.SEED_PASSWORD || 'temporal1234', 12) // nosec: intentional seed credential
  await prisma.user.createMany({
    data: [
      { name: 'Admin Termas', email: 'admin@termas.cl', password: hashedSuperPassword, role: 'admin', roleName: 'Administrador', organizationId: orgId },
      { name: 'Recepción Central', email: 'recepcion@termas.cl', password: hashedSuperPassword, role: 'recepcionista', roleName: 'Recepcionista', organizationId: orgId },
      { name: 'Juan Mucamo', email: 'empleado@termas.cl', password: hashedSuperPassword, role: 'empleado', roleName: 'Limpieza', organizationId: orgId },
    ]
  })
  console.log('✔ Usuarios de Termas creados.')

  // 3. Tipos de Unidades
  const utFamiliar = await prisma.unitType.create({
    data: { name: 'Cabaña Familiar', maxOccupancy: 6, organizationId: orgId }
  })
  const utSuite = await prisma.unitType.create({
    data: { name: 'Suite Termal', maxOccupancy: 2, organizationId: orgId }
  })
  console.log('✔ Tipos de Unidad creados.')

  // 4. Habitaciones (10 cabañas familiares, 5 suites termales)
  const rooms = []
  for (let i = 1; i <= 10; i++) {
    const r = await prisma.room.create({
      data: { code: `C${i}`, name: `Cabaña ${i}`, unitTypeId: utFamiliar.id, organizationId: orgId }
    })
    rooms.push(r)
  }
  for (let i = 1; i <= 5; i++) {
    const r = await prisma.room.create({
      data: { code: `S${i}`, name: `Suite ${i}`, unitTypeId: utSuite.id, organizationId: orgId }
    })
    rooms.push(r)
  }
  console.log('✔ 15 Habitaciones creadas.')

  // 5. Tarifas
  const rateAlta = await prisma.rate.create({
    data: { name: 'Tarifa Alta', rackRate: 120000, organizationId: orgId, unitTypeId: utFamiliar.id }
  })
  const rateBaja = await prisma.rate.create({
    data: { name: 'Tarifa Baja', rackRate: 80000, organizationId: orgId, unitTypeId: utFamiliar.id }
  })
  const rateSuite = await prisma.rate.create({
    data: { name: 'Suite Standard', rackRate: 95000, organizationId: orgId, unitTypeId: utSuite.id }
  })
  console.log('✔ Tarifas creadas.')

  // 6. Huéspedes (Crearemos 30 huéspedes recurrentes)
  const guests = []
  for (let i = 1; i <= 30; i++) {
    const g = await prisma.guest.create({
      data: { 
        firstName: `Huésped`, lastName: `Termal ${i}`, 
        email: `huesped${i}@mail.com`, phone: `+569888877${i.toString().padStart(2, '0')}`,
        organizationId: orgId
      }
    })
    guests.push(g)
  }
  console.log('✔ Huéspedes creados.')

  // 7. Generar Reservas Orgánicas
  // Iteraremos día por día desde Enero hasta el Futuro
  let currentDate = new Date(START_DATE)
  let resCount = 0

  while (currentDate <= END_DATE) {
    const month = currentDate.getMonth()
    // Alta en Ene(0), Feb(1), Jul(6) -> 80% ocupación. Baja -> 30%
    const isHighSeason = [0, 1, 6].includes(month)
    const probNewReservation = isHighSeason ? 0.7 : 0.2

    if (Math.random() < probNewReservation) {
      // Pick random room and guest
      const room = rooms[Math.floor(Math.random() * rooms.length)]
      const guest = guests[Math.floor(Math.random() * guests.length)]
      
      const stayDays = Math.floor(Math.random() * 4) + 1 // 1 a 4 días
      const arrival = new Date(currentDate)
      arrival.setHours(14, 0, 0, 0)
      const departure = new Date(arrival)
      departure.setDate(departure.getDate() + stayDays)
      departure.setHours(11, 0, 0, 0)

      // Determinar estado de reserva
      let status = 'confirmed'
      if (departure < TODAY) status = 'checked_out'
      else if (arrival <= TODAY && departure > TODAY) status = 'checked_in'

      const isSuite = room.unitTypeId === utSuite.id
      const cabinPrice = isHighSeason ? 120000 : 80000
      const price = isSuite ? 95000 : cabinPrice
      const unitTotal = price * stayDays

      const adults = isSuite ? 2 : 4
      const children = isSuite ? 0 : 2
      const rateId = isSuite ? rateSuite.id : (isHighSeason ? rateAlta.id : rateBaja.id)
      let totalPaid = 0
      if (status === 'checked_out') totalPaid = unitTotal
      else if (status === 'checked_in') totalPaid = unitTotal / 2

      await prisma.reservation.create({
        data: {
          organizationId: orgId,
          guestId: guest.id,
          status: status,
          adults,
          children,
          unitTotal: unitTotal,
          totalPaid,
          rooms: {
            create: {
              roomId: room.id,
              arrival: arrival,
              departure: departure,
              nights: stayDays,
              adults,
              children,
              unitTotal: unitTotal,
              rateId
            }
          }
        }
      })
      resCount++
    }
    
    // Avanzar un día
    currentDate.setDate(currentDate.getDate() + 1)
  }

  console.log(`✔ Se generaron ${resCount} reservas orgánicas.`)

  // 8. Crear Memos en Pizarra para que el empleado vea
  await prisma.memo.createMany({
    data: [
      { organizationId: orgId, content: 'Recordar revisar toallas de Cabaña 3', author: 'Admin Termas' },
      { organizationId: orgId, content: 'Suite 2 necesita cambio de filtro de spa hoy a las 15:00', author: 'Admin Termas' }
    ]
  })
  console.log('✔ Memos iniciales creados.')

  console.log('✅ SEED COMPLETADO CON ÉXITO.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
