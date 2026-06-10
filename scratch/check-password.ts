import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@capiña.cl'
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.log(`User not found for email: ${email}`)
    return
  }

  console.log(`User found: ${user.email}`)
  const isMatch = await bcrypt.compare('admin123', user.password)
  console.log(`Password 'admin123' matches? ${isMatch}`)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
