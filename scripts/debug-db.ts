const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'termas' } },
    include: { organization: true }
  })
  console.log("Users:")
  console.log(JSON.stringify(users, null, 2))

  const orgs = await prisma.organization.findMany({
    where: { name: { contains: 'Termas' } },
    include: { _count: { select: { rooms: true, reservations: true, users: true } } }
  })
  console.log("\nOrganizations:")
  console.log(JSON.stringify(orgs, null, 2))
}

main().finally(() => prisma.$disconnect())
