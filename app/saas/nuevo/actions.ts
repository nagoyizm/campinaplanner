'use server'

import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function createOrganization(formData: FormData) {
  // Protect this action
  await requireSuperAdmin()

  const orgName = formData.get('orgName') as string
  const orgSlug = formData.get('orgSlug') as string
  const adminName = formData.get('adminName') as string
  const adminEmail = formData.get('adminEmail') as string
  const adminPassword = formData.get('adminPassword') as string

  if (!orgName || !orgSlug || !adminName || !adminEmail || !adminPassword) {
    return { error: 'Todos los campos son obligatorios' }
  }

  try {
    // Check if slug exists
    const existingOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } })
    if (existingOrg) return { error: 'El slug ya está en uso por otra organización' }

    // Check if email exists globally
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (existingUser) return { error: 'El correo electrónico ya está registrado en el sistema' }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Run in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create Org
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          plan: 'starter'
        }
      })

      // 2. Create Admin User
      await tx.user.create({
        data: {
          organizationId: org.id,
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          roleName: 'Propietario',
          active: true
        }
      })
    })

    revalidatePath('/saas')
    return { success: true }
    
  } catch (error: any) {
    console.error('Error creating org:', error)
    return { error: error.message || 'Error interno del servidor al crear el cliente' }
  }
}
