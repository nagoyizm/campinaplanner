import { z } from 'zod'

export const userRoleEnum = z.enum(['superadmin', 'admin', 'operator', 'observer', 'recepcionista', 'empleado'])

export const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').max(150),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
  phone: z.string().max(20).optional().nullable(),
  role: userRoleEnum.default('operator'),
  roleName: z.string().max(50).default('Recepción'),
  active: z.boolean().default(true)
})

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100).optional().nullable().or(z.literal('')),
})

export const createReservationSchema = z.object({
  guestId: z.string().cuid('ID de huésped inválido'),
  rooms: z.array(z.string().cuid()).min(1, 'Debe incluir al menos una habitación'),
  arrival: z.string().datetime().or(z.date()),
  departure: z.string().datetime().or(z.date()),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  pets: z.number().int().min(0).default(0),
  source: z.string().max(50).default('Directa'),
  notes: z.string().max(1000).optional().nullable()
})
