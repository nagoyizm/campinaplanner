import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando organización y usuario SuperAdmin del Sistema...')

  // 1. Create System Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'system-plannerio' },
    update: {},
    create: {
      id: 'seed-org-system',
      name: 'Plannerio Global',
      slug: 'system-plannerio',
      plan: 'enterprise',
    },
  })
  console.log('✅ Organización base creada:', org.name)

  // 2. Create SuperAdmin User
  const password = await bcrypt.hash('S3cur3P4ssw0rd!2026', 12)
  const user = await prisma.user.upsert({
    where: { email: 'superadmin@plannerio.cl' },
    update: {},
    create: {
      email: 'superadmin@plannerio.cl',
      name: 'Plannerio SuperAdmin',
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
