import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando organización y usuario SuperAdmin del Sistema...')

  // 1. Create System Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'system-habita' },
    update: {},
    create: {
      id: 'seed-org-system',
      name: 'Habita Global',
      slug: 'system-habita',
      plan: 'enterprise',
    },
  })
  console.log('✅ Organización base creada:', org.name)

  // 2. Create SuperAdmin User
  const password = process.env.SEED_PASSWORD || 'S3cur3P4ssw0rd!2026'
  const hashedPassword = await bcrypt.hash(password, 12) // nosec: intentional seed credential
  const user = await prisma.user.upsert({
    where: { email: 'superadmin@habita.cl' },
    update: {},
    create: {
      email: 'superadmin@habita.cl',
      name: 'Habita SuperAdmin',
      password,
      role: 'superadmin',
      roleName: 'System Admin',
      organizationId: org.id,
    },
  })
  console.log(`✅ Usuario Creado: ${user.email} (Rol: ${user.role})`)
  console.log('Clave: S3cur3P4ssw0rd!2026')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
