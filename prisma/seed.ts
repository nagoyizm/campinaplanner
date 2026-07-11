import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // ──────────────────────────────────────────────
  // 1. TIPOS DE UNIDAD
  // ──────────────────────────────────────────────
  const cab5p = await prisma.unitType.upsert({
    where: { id: 'unit-cab5p' },
    update: {},
    create: {
      id: 'unit-cab5p',
      name: 'Cabaña 5P',
      description: 'Cabaña para hasta 5 personas',
      maxOccupancy: 5,
      sortOrder: 1,
    },
  })

  const cab7p = await prisma.unitType.upsert({
    where: { id: 'unit-cab7p' },
    update: {},
    create: {
      id: 'unit-cab7p',
      name: 'Cabaña 7P',
      description: 'Cabaña para hasta 7 personas',
      maxOccupancy: 7,
      sortOrder: 2,
    },
  })

  const suiteStd = await prisma.unitType.upsert({
    where: { id: 'unit-suite-std' },
    update: {},
    create: {
      id: 'unit-suite-std',
      name: 'Suite Standard',
      description: 'Suite estándar',
      maxOccupancy: 2,
      sortOrder: 3,
    },
  })

  const suiteDlx = await prisma.unitType.upsert({
    where: { id: 'unit-suite-dlx' },
    update: {},
    create: {
      id: 'unit-suite-dlx',
      name: 'Suite Deluxe',
      description: 'Suite deluxe',
      maxOccupancy: 2,
      sortOrder: 4,
    },
  })

  const suiteSup = await prisma.unitType.upsert({
    where: { id: 'unit-suite-sup' },
    update: {},
    create: {
      id: 'unit-suite-sup',
      name: 'Suite Superior',
      description: 'Suite superior',
      maxOccupancy: 3,
      sortOrder: 5,
    },
  })

  console.log('✅ Tipos de unidad creados')

  // ──────────────────────────────────────────────
  // 2. TARIFAS BASE
  // ──────────────────────────────────────────────
  const rateCab5pAlta = await prisma.rate.upsert({
    where: { id: 'rate-cab5p-alta' },
    update: {},
    create: {
      id: 'rate-cab5p-alta',
      name: 'Cabaña 5P Temporada Alta',
      unitTypeId: cab5p.id,
      rackRate: 95000,
      includedOccupants: 5,
      extraPersonAdult: 0,
      extraPersonChild: 0,
      weekendSurcharge: 0,
    },
  })

  await prisma.rate.upsert({
    where: { id: 'rate-cab5p-baja' },
    update: {},
    create: {
      id: 'rate-cab5p-baja',
      name: 'Cabaña 5P Temporada Baja',
      unitTypeId: cab5p.id,
      rackRate: 70000,
      includedOccupants: 5,
      extraPersonAdult: 0,
      extraPersonChild: 0,
      weekendSurcharge: 0,
    },
  })

  const rateCab7pAlta = await prisma.rate.upsert({
    where: { id: 'rate-cab7p-alta' },
    update: {},
    create: {
      id: 'rate-cab7p-alta',
      name: 'Cabaña 7P Temporada Alta',
      unitTypeId: cab7p.id,
      rackRate: 120000,
      includedOccupants: 7,
      extraPersonAdult: 0,
      extraPersonChild: 0,
      weekendSurcharge: 0,
    },
  })

  await prisma.rate.upsert({
    where: { id: 'rate-cab7p-baja' },
    update: {},
    create: {
      id: 'rate-cab7p-baja',
      name: 'Cabaña 7P Temporada Baja',
      unitTypeId: cab7p.id,
      rackRate: 90000,
      includedOccupants: 7,
      extraPersonAdult: 0,
      extraPersonChild: 0,
      weekendSurcharge: 0,
    },
  })

  const rateSuiteStd = await prisma.rate.upsert({
    where: { id: 'rate-suite-std' },
    update: {},
    create: {
      id: 'rate-suite-std',
      name: 'Suite Standard',
      unitTypeId: suiteStd.id,
      rackRate: 65000,
      includedOccupants: 2,
      extraPersonAdult: 15000,
      extraPersonChild: 8000,
      weekendSurcharge: 0,
    },
  })

  const rateSuiteDlx = await prisma.rate.upsert({
    where: { id: 'rate-suite-dlx' },
    update: {},
    create: {
      id: 'rate-suite-dlx',
      name: 'Suite Deluxe',
      unitTypeId: suiteDlx.id,
      rackRate: 80000,
      includedOccupants: 2,
      extraPersonAdult: 18000,
      extraPersonChild: 10000,
      weekendSurcharge: 0,
    },
  })

  const rateSuiteSup = await prisma.rate.upsert({
    where: { id: 'rate-suite-sup' },
    update: {},
    create: {
      id: 'rate-suite-sup',
      name: 'Suite Superior',
      unitTypeId: suiteSup.id,
      rackRate: 95000,
      includedOccupants: 2,
      extraPersonAdult: 20000,
      extraPersonChild: 12000,
      weekendSurcharge: 0,
    },
  })

  console.log('✅ Tarifas creadas')

  // ──────────────────────────────────────────────
  // 3. ROOMS (Habitaciones individuales)
  // ──────────────────────────────────────────────
  // 4 Cabañas 5P
  const cab5pRooms = [
    { id: 'room-c1', code: 'C1', name: 'a-Cabaña 1', sortOrder: 1 },
    { id: 'room-c2', code: 'C2', name: 'b-Cabaña 2', sortOrder: 2 },
    { id: 'room-c3', code: 'C3', name: 'c-Cabaña 3', sortOrder: 3 },
    { id: 'room-c4', code: 'C4', name: 'd-Cabaña 4', sortOrder: 4 },
  ]
  for (const r of cab5pRooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, unitTypeId: cab5p.id, defaultRateId: rateCab5pAlta.id },
    })
  }

  // 6 Cabañas 7P
  const cab7pRooms = [
    { id: 'room-c5', code: 'C5', name: 'e-Cabaña 5', sortOrder: 5 },
    { id: 'room-c6', code: 'C6', name: 'f-Cabaña 6', sortOrder: 6 },
    { id: 'room-c7', code: 'C7', name: 'g-Cabaña 7', sortOrder: 7 },
    { id: 'room-c8', code: 'C8', name: 'h-Cabaña 8', sortOrder: 8 },
    { id: 'room-c9', code: 'C9', name: 'i-Cabaña 9', sortOrder: 9 },
    { id: 'room-c10', code: 'C10', name: 'j-Cabaña 10', sortOrder: 10 },
  ]
  for (const r of cab7pRooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, unitTypeId: cab7p.id, defaultRateId: rateCab7pAlta.id },
    })
  }

  // 3 Suites Standard
  const suiteStdRooms = [
    { id: 'room-s1', code: 'S1', name: 'k-Suite STD 1', sortOrder: 11 },
    { id: 'room-s2', code: 'S2', name: 'l-Suite STD 2', sortOrder: 12 },
    { id: 'room-s3', code: 'S3', name: 'm-Suite STD 3', sortOrder: 13 },
  ]
  for (const r of suiteStdRooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, unitTypeId: suiteStd.id, defaultRateId: rateSuiteStd.id },
    })
  }

  // 3 Suites Deluxe
  const suiteDlxRooms = [
    { id: 'room-d1', code: 'D1', name: 'n-Suite DLX 1', sortOrder: 14 },
    { id: 'room-d2', code: 'D2', name: 'o-Suite DLX 2', sortOrder: 15 },
    { id: 'room-d3', code: 'D3', name: 'p-Suite DLX 3', sortOrder: 16 },
  ]
  for (const r of suiteDlxRooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, unitTypeId: suiteDlx.id, defaultRateId: rateSuiteDlx.id },
    })
  }

  // 2 Suites Superior
  const suiteSupRooms = [
    { id: 'room-p1', code: 'P1', name: 'q-Suite SUP 1', sortOrder: 17 },
    { id: 'room-p2', code: 'P2', name: 'r-Suite SUP 2', sortOrder: 18 },
  ]
  for (const r of suiteSupRooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, unitTypeId: suiteSup.id, defaultRateId: rateSuiteSup.id },
    })
  }

  console.log('✅ Habitaciones creadas (18 rooms)')

  // ──────────────────────────────────────────────
  // 4. USUARIO ADMIN INICIAL
  // ──────────────────────────────────────────────
  const hashedSuperPassword = await bcrypt.hash(process.env.SEED_PASSWORD || 'temporal1234', 12) // nosec: intentional seed credential
  await prisma.user.upsert({
    where: { email: 'admin@capiña.cl' },
    update: {
      password: hashedSuperPassword,
    },
    create: {
      email: 'admin@capiña.cl',
      name: 'Administrador',
      password: hashedPassword,
      role: 'admin',
      roleName: 'Administrador',
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@campina.cl' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'admin@campina.cl',
      name: 'Administrador ASCII',
      password: hashedPassword,
      role: 'admin',
      roleName: 'Administrador',
    },
  })

  console.log('✅ Usuario admin creado: admin@capiña.cl / admin@campina.cl / admin123')

  // ──────────────────────────────────────────────
  // 5. AMENITIES BASE
  // ──────────────────────────────────────────────
  const amenities = [
    { id: 'amenity-leña', name: 'Leña (bolsa)', category: 'Servicios', price: 5000, unit: 'unidad' },
    { id: 'amenity-desayuno', name: 'Desayuno', category: 'Alimentos', price: 8000, unit: 'por persona' },
    { id: 'amenity-late', name: 'Late Check-out', category: 'Servicios', price: 15000, unit: 'por hora' },
    { id: 'amenity-early', name: 'Early Check-in', category: 'Servicios', price: 15000, unit: 'por hora' },
    { id: 'amenity-mascota', name: 'Cargo mascota', category: 'Servicios', price: 10000, unit: 'por noche' },
  ]
  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    })
  }

  console.log('✅ Amenities creados')

  // ──────────────────────────────────────────────
  // 6. RESERVAS DE EJEMPLO
  // ──────────────────────────────────────────────
  const guestEjemplo = await prisma.guest.upsert({
    where: { id: 'guest-ejemplo' },
    update: {},
    create: {
      id: 'guest-ejemplo',
      firstName: 'Patricio',
      lastName: 'Acuña',
      rut: '12.345.678-9',
      email: 'pacuna@gmail.com',
      phone: '+56912345678',
      nationality: 'Chile',
      notes: 'PAX decente pero ruidosos',
      tags: JSON.stringify(['ruidoso']),
    },
  })

  const today = new Date()
  today.setHours(14, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 2)

  const reservaEjemplo = await prisma.reservation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      guestId: guestEjemplo.id,
      status: 'confirmed',
      isNoisy: true,
      adults: 4,
      children: 1,
      pets: 0,
      paymentMethod: 'transferencia',
      unitTotal: 190000,
      totalPaid: 190000,
      notes: 'Promo 10% dcto. día de la madre',
      discounts: 19000,
    },
  })

  await prisma.reservationRoom.upsert({
    where: { id: 'rr-ejemplo-1' },
    update: {},
    create: {
      id: 'rr-ejemplo-1',
      reservationId: reservaEjemplo.id,
      roomId: 'room-c1',
      rateId: rateCab5pAlta.id,
      arrival: today,
      departure: tomorrow,
      nights: 2,
      adults: 4,
      children: 1,
      unitRate: 95000,
      unitTotal: 190000,
    },
  })

  console.log('✅ Reserva de ejemplo creada (Rsv #1)')
  console.log('')
  console.log('🎉 Seed completado exitosamente!')
  console.log('   → 5 tipos de unidad')
  console.log('   → 7 tarifas')
  console.log('   → 18 habitaciones')
  console.log('   → 1 usuario admin')
  console.log('   → 5 amenities')
  console.log('   → 1 reserva de ejemplo')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
