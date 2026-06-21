const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Generando reservas específicas para HOY en Termas del Sur...')

  // Encontrar la org correcta (la que tiene habitaciones)
  const org = await prisma.organization.findFirst({
    where: { name: 'Termas del Sur', rooms: { some: {} } },
    include: { rooms: true, rates: true, guests: true }
  })

  if (!org) {
    console.log('No se encontró la organización Termas del Sur con datos.')
    return
  }

  const orgId = org.id
  const rooms = org.rooms
  const rates = org.rates
  let guests = org.guests

  // Si no hay huéspedes suficientes, crear un par
  if (guests.length < 5) {
    const newGuest = await prisma.guest.create({
      data: { firstName: 'Visitante', lastName: 'Hoy', email: 'hoy@mail.com', organizationId: orgId }
    })
    guests.push(newGuest)
  }

  const TODAY = new Date()
  TODAY.setHours(0, 0, 0, 0)
  
  // Helpers de fechas
  const dateAt = (daysOffset, hours) => {
    const d = new Date(TODAY)
    d.setDate(d.getDate() + daysOffset)
    d.setHours(hours, 0, 0, 0)
    return d
  }

  let rIdx = 0
  const getRoom = () => rooms[rIdx++ % rooms.length]
  const getGuest = () => guests[Math.floor(Math.random() * guests.length)]
  const getRate = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    const rate = rates.find(rt => rt.unitTypeId === room.unitTypeId)
    return rate || rates[0]
  }

  // 1. Llegando hoy (pendientes de check-in) -> status: confirmed
  for (let i=0; i<3; i++) {
    const room = getRoom()
    const rate = getRate(room.id)
    await prisma.reservation.create({
      data: {
        organizationId: orgId, guestId: getGuest().id,
        status: 'confirmed', adults: 2, children: 0, unitTotal: rate.rackRate * 2, totalPaid: 0,
        rooms: { create: {
          roomId: room.id, arrival: dateAt(0, 15), departure: dateAt(2, 11), nights: 2, adults: 2, children: 0, unitTotal: rate.rackRate * 2, rateId: rate.id
        }}
      }
    })
  }

  // 2. Llegando hoy (ya hicieron check-in) -> status: checked_in
  for (let i=0; i<2; i++) {
    const room = getRoom()
    const rate = getRate(room.id)
    await prisma.reservation.create({
      data: {
        organizationId: orgId, guestId: getGuest().id,
        status: 'checked_in', adults: 2, children: 0, unitTotal: rate.rackRate * 3, totalPaid: rate.rackRate * 3,
        rooms: { create: {
          roomId: room.id, arrival: dateAt(0, 15), departure: dateAt(3, 11), nights: 3, adults: 2, children: 0, unitTotal: rate.rackRate * 3, rateId: rate.id
        }}
      }
    })
  }

  // 3. Saliendo hoy (todavía no hacen check-out) -> status: checked_in
  for (let i=0; i<3; i++) {
    const room = getRoom()
    const rate = getRate(room.id)
    await prisma.reservation.create({
      data: {
        organizationId: orgId, guestId: getGuest().id,
        status: 'checked_in', adults: 2, children: 0, unitTotal: rate.rackRate * 2, totalPaid: rate.rackRate * 2,
        rooms: { create: {
          roomId: room.id, arrival: dateAt(-2, 15), departure: dateAt(0, 11), nights: 2, adults: 2, children: 0, unitTotal: rate.rackRate * 2, rateId: rate.id
        }}
      }
    })
  }

  // 4. Saliendo hoy (YA hicieron check-out) -> status: checked_out
  for (let i=0; i<3; i++) {
    const room = getRoom()
    const rate = getRate(room.id)
    await prisma.reservation.create({
      data: {
        organizationId: orgId, guestId: getGuest().id,
        status: 'checked_out', adults: 2, children: 0, unitTotal: rate.rackRate * 4, totalPaid: rate.rackRate * 4,
        rooms: { create: {
          roomId: room.id, arrival: dateAt(-4, 15), departure: dateAt(0, 11), nights: 4, adults: 2, children: 0, unitTotal: rate.rackRate * 4, rateId: rate.id
        }}
      }
    })
  }

  // 5. Reservas aleatorias extra durante este mes
  for (let i=0; i<8; i++) {
    const room = getRoom()
    const rate = getRate(room.id)
    const randomOffset = Math.floor(Math.random() * 20) - 10 // Entre -10 y +10 días
    const stay = 2
    const status = randomOffset < 0 ? (randomOffset + stay < 0 ? 'checked_out' : 'checked_in') : 'confirmed'
    
    await prisma.reservation.create({
      data: {
        organizationId: orgId, guestId: getGuest().id,
        status: status, adults: 2, children: 0, unitTotal: rate.rackRate * stay, totalPaid: status === 'confirmed' ? 0 : rate.rackRate * stay,
        rooms: { create: {
          roomId: room.id, arrival: dateAt(randomOffset, 15), departure: dateAt(randomOffset + stay, 11), nights: stay, adults: 2, children: 0, unitTotal: rate.rackRate * stay, rateId: rate.id
        }}
      }
    })
  }

  console.log('✅ Se insertaron múltiples reservas de Hoy y de este mes.')
}

main().finally(() => prisma.$disconnect())
