import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@capiña.cl'
  // Read password from CLI arg or env — never hardcode secrets in source
  // Usage: npx ts-node scratch/check-password.ts <password>
  const passwordToCheck = process.argv[2] ?? process.env.CHECK_PASSWORD
  if (!passwordToCheck) {
    console.error('Usage: npx ts-node scratch/check-password.ts <password>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.log(`User not found for email: ${email}`)
    return
  }

  console.log(`User found: ${user.email}`)
  const isMatch = await bcrypt.compare(passwordToCheck, user.password)
  console.log(`Password matches? ${isMatch}`)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
