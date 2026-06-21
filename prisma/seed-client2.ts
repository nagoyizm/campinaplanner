/**
 * prisma/seed-client2.ts
 * Crea el segundo cliente de demostración: "Termas del Sur Lodge"
 * con su organización, usuario admin, habitaciones y una reserva de ejemplo.
 *
 * Ejecución:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-client2.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const ORG_ID = 'org-termas-del-sur'

async function main() {
  console.log('🌱 Creando cliente 2: Termas del Sur Lodge...')

  // ── 1. ORGANIZACIÓN ────────────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'Termas del Sur Lodge',
      slug: 'termas-del-sur',
      timezone: 'America/Santiago',
      currency: 'CLP',
      plan: 'starter',
      active: true,
    },
  })
  console.log('✅ Organización creada: Termas del Sur Lodge')

  // ── 2. USUARIO ADMIN ───────────────────────────────────────────
  const hash = await bcrypt.hash('termas123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@termasdelsur.cl' },
    update: { password: hash },
    create: {
      email: 'admin@termasdelsur.cl',
      name: 'Administrador Termas',
      password: hash,
      role: 'admin',
      roleName: 'Administrador',
      organizationId: ORG_ID,
    },
  })
  console.log('✅ Usuario: admin@termasdelsur.cl / termas123')

  // ── 3. TIPOS DE HABITACIÓN ─────────────────────────────────────
  const bungalow = await prisma.unitType.upsert({
    where: { id: `${ORG_ID}-bungalow` },
    update: {},
    create: {
      id: `${ORG_ID}-bungalow`,
      organizationId: ORG_ID,
      name: 'Bungalow Termal',
      description: 'Bungalow con acceso directo a termas naturales',
      maxOccupancy: 4,
      sortOrder: 1,
    },
  })

  const suite = await prisma.unitType.upsert({
    where: { id: `${ORG_ID}-suite` },
    update: {},
    create: {
      id: `${ORG_ID}-suite`,
      organizationId: ORG_ID,
      name: 'Suite Vista Volcán',
      description: 'Suite de lujo con vista al volcán Villarrica',
      maxOccupancy: 2,
      sortOrder: 2,
    },
  })

  const cabaña = await prisma.unitType.upsert({
    where: { id: `${ORG_ID}-cabana` },
    update: {},
    create: {
      id: `${ORG_ID}-cabana`,
      organizationId: ORG_ID,
      name: 'Cabaña Familiar',
      description: 'Cabaña amplia para familias con chimenea',
      maxOccupancy: 6,
      sortOrder: 3,
    },
  })
  console.log('✅ Tipos de habitación creados (3)')

  // ── 4. TARIFAS ─────────────────────────────────────────────────
  const rateBungalow = await prisma.rate.upsert({
    where: { id: `${ORG_ID}-rate-bungalow` },
    update: {},
    create: {
      id: `${ORG_ID}-rate-bungalow`,
      organizationId: ORG_ID,
      name: 'Bungalow Termal — Tarifa General',
      unitTypeId: bungalow.id,
      rackRate: 85000,
      includedOccupants: 2,
      extraPersonAdult: 20000,
      extraPersonChild: 10000,
      weekendSurcharge: 15000,
    },
  })

  const rateSuite = await prisma.rate.upsert({
    where: { id: `${ORG_ID}-rate-suite` },
    update: {},
    create: {
      id: `${ORG_ID}-rate-suite`,
      organizationId: ORG_ID,
      name: 'Suite Vista Volcán — Tarifa General',
      unitTypeId: suite.id,
      rackRate: 130000,
      includedOccupants: 2,
      extraPersonAdult: 0,
      extraPersonChild: 0,
      weekendSurcharge: 20000,
    },
  })

  const rateCabana = await prisma.rate.upsert({
    where: { id: `${ORG_ID}-rate-cabana` },
    update: {},
    create: {
      id: `${ORG_ID}-rate-cabana`,
      organizationId: ORG_ID,
      name: 'Cabaña Familiar — Tarifa General',
      unitTypeId: cabaña.id,
      rackRate: 110000,
      includedOccupants: 4,
      extraPersonAdult: 15000,
      extraPersonChild: 8000,
      weekendSurcharge: 10000,
    },
  })
  console.log('✅ Tarifas creadas (3)')

  // ── 5. HABITACIONES ────────────────────────────────────────────
  const rooms = [
    { id: `${ORG_ID}-B1`, code: 'B1', name: 'Bungalow 1',     unitTypeId: bungalow.id, defaultRateId: rateBungalow.id, sortOrder: 1 },
    { id: `${ORG_ID}-B2`, code: 'B2', name: 'Bungalow 2',     unitTypeId: bungalow.id, defaultRateId: rateBungalow.id, sortOrder: 2 },
    { id: `${ORG_ID}-B3`, code: 'B3', name: 'Bungalow 3',     unitTypeId: bungalow.id, defaultRateId: rateBungalow.id, sortOrder: 3 },
    { id: `${ORG_ID}-SV1`, code: 'SV1', name: 'Suite Volcán 1', unitTypeId: suite.id,    defaultRateId: rateSuite.id,   sortOrder: 4 },
    { id: `${ORG_ID}-SV2`, code: 'SV2', name: 'Suite Volcán 2', unitTypeId: suite.id,    defaultRateId: rateSuite.id,   sortOrder: 5 },
    { id: `${ORG_ID}-CF1`, code: 'CF1', name: 'Cabaña Familiar 1', unitTypeId: cabaña.id, defaultRateId: rateCabana.id, sortOrder: 6 },
    { id: `${ORG_ID}-CF2`, code: 'CF2', name: 'Cabaña Familiar 2', unitTypeId: cabaña.id, defaultRateId: rateCabana.id, sortOrder: 7 },
  ]

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, organizationId: ORG_ID },
    })
  }
  console.log('✅ Habitaciones creadas (7)')

  // ── 6. AMENITIES ────────────────────────────────────────────────
  const amenities = [
    { id: `${ORG_ID}-amenity-acceso-terma`, name: 'Acceso Terma Privada', category: 'Servicios', price: 25000, unit: 'por noche' },
    { id: `${ORG_ID}-amenity-desayuno`,     name: 'Desayuno Sureño',      category: 'Alimentos', price: 9500,  unit: 'por persona' },
    { id: `${ORG_ID}-amenity-cena`,         name: 'Cena Típica',          category: 'Alimentos', price: 18000, unit: 'por persona' },
    { id: `${ORG_ID}-amenity-late`,         name: 'Late Check-out',        category: 'Servicios', price: 20000, unit: 'por hora' },
  ]
  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, organizationId: ORG_ID },
    })
  }
  console.log('✅ Amenities creados (4)')

  // ── 7. HUÉSPED + RESERVA DE EJEMPLO ────────────────────────────
  const guest = await prisma.guest.upsert({
    where: { id: `${ORG_ID}-guest-1` },
    update: {},
    create: {
      id: `${ORG_ID}-guest-1`,
      organizationId: ORG_ID,
      firstName: 'Valentina',
      lastName: 'Rojas',
      rut: '16.543.210-K',
      email: 'vrojas@gmail.com',
      phone: '+56987654321',
      nationality: 'Chile',
      notes: 'Huésped frecuente, prefiere bungalow cerca del río',
      tags: JSON.stringify(['VIP']),
      totalStays: 3,
    },
  })

  const guest2 = await prisma.guest.upsert({
    where: { id: `${ORG_ID}-guest-2` },
    update: {},
    create: {
      id: `${ORG_ID}-guest-2`,
      organizationId: ORG_ID,
      firstName: 'Rodrigo',
      lastName: 'Muñoz',
      rut: '14.321.987-5',
      email: 'romunoz@hotmail.com',
      phone: '+56934567890',
      nationality: 'Chile',
    },
  })

  // Reserva 1: vigente esta semana
  const today = new Date()
  today.setHours(14, 0, 0, 0)
  const arrival1 = new Date(today); arrival1.setDate(today.getDate() - 1)
  const departure1 = new Date(today); departure1.setDate(today.getDate() + 3)

  const rsv1 = await prisma.reservation.create({
    data: {
      organizationId: ORG_ID,
      guestId: guest.id,
      status: 'checked_in',
      isVip: true,
      adults: 2,
      children: 0,
      pets: 1,
      paymentMethod: 'tarjeta_credito',
      unitTotal: 340000,
      totalPaid: 340000,
      notes: 'Huésped VIP. Acceso a spa incluido.',
      guaranteeRsv: 'true',
    },
  })
  await prisma.reservationRoom.create({
    data: {
      reservationId: rsv1.id,
      roomId: `${ORG_ID}-B1`,
      rateId: rateBungalow.id,
      arrival: arrival1,
      departure: departure1,
      nights: 4,
      adults: 2,
      children: 0,
      unitRate: 85000,
      unitTotal: 340000,
    },
  })

  // Reserva 2: próxima semana
  const arrival2 = new Date(today); arrival2.setDate(today.getDate() + 5)
  const departure2 = new Date(today); departure2.setDate(today.getDate() + 8)

  const rsv2 = await prisma.reservation.create({
    data: {
      organizationId: ORG_ID,
      guestId: guest2.id,
      status: 'confirmed',
      adults: 2,
      children: 2,
      pets: 0,
      paymentMethod: 'transferencia',
      unitTotal: 220000,
      totalPaid: 110000,
      notes: 'Pagó 50% de anticipo',
      guaranteeRsv: 'true',
    },
  })
  await prisma.reservationRoom.create({
    data: {
      reservationId: rsv2.id,
      roomId: `${ORG_ID}-CF1`,
      rateId: rateCabana.id,
      arrival: arrival2,
      departure: departure2,
      nights: 3,
      adults: 2,
      children: 2,
      unitRate: 110000,
      unitTotal: 330000,
    },
  })

  console.log('✅ 2 huéspedes y 2 reservas de ejemplo creadas')
  console.log('')
  console.log('🎉 Cliente 2 listo!')
  console.log('   Login: admin@termasdelsur.cl / termas123')
  console.log('   Org slug: termas-del-sur')
  console.log('   Habitaciones: 3 Bungalows, 2 Suites Volcán, 2 Cabañas Familiares')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
