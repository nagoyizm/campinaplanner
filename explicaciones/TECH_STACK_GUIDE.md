# Guía del Stack Técnico: Cómo se construyó Campiña Planner
*Un recorrido didáctico con cada línea de código explicada, como si fuera una clase.*

---

## 🗺️ Mapa de la App

| Herramienta | Rol en el proyecto | Analogía |
|---|---|---|
| **Next.js** | El corazón. Sirve páginas, APIs y lógica de negocio | El edificio completo |
| **TypeScript** | Le pone "etiquetas" a los datos para evitar errores | El reglamento interno |
| **Prisma ORM** | El mensajero entre el código y la base de datos | El traductor |
| **PostgreSQL (Supabase)** | Donde se guardan todos los datos | El archivo general |
| **NextAuth.js** | El sistema de portería (login y sesiones) | El guardia de seguridad |
| **CSS Modules** | El sistema de estilos visuales aislados | El departamento de diseño |
| **Lucide React** | Los íconos de la interfaz | El catálogo de pictogramas |
| **Vercel** | Donde vive la app publicada en internet | El edificio alquilado en la nube |

---

## 1. Next.js: El Corazón de la App

**Next.js** es un framework construido sobre **React** que te permite hacer todo en un solo proyecto: la pantalla que ve el usuario, y el servidor que entrega los datos.

### La regla del App Router

> La **ubicación** de un archivo dentro de `/app` define su URL en el navegador.

```
app/
  dashboard/
    page.tsx      → La pantalla de /dashboard
    layout.tsx    → El menú lateral que envuelve /dashboard
  reservas/
    page.tsx      → La pantalla de /reservas
  api/
    reservas/
      route.ts    → La API en /api/reservas
      [id]/
        route.ts  → La API en /api/reservas/123 (el [id] es dinámico, acepta cualquier número)
```

---

### 1.1 Server Component: El Recepcionista de la Cocina

Un Server Component es un archivo que **no empieza con `'use client'`**. Corre en el servidor. Puede hablar directamente con la base de datos.

**Ejemplo real — `app/dashboard/page.tsx`:**

```typescript
// "export default" significa: "esta es la función principal de este archivo,
// la que Next.js va a buscar para renderizar la página".
// "async" significa que la función puede "esperar" resultados lentos
// (como consultas a la base de datos) usando la palabra "await".
export default async function DashboardPage() {

  // "await" pausa la ejecución AQUÍ hasta que requireOrg() termine.
  // requireOrg() devuelve un objeto, y con "{ organizationId }" tomamos
  // SOLO esa propiedad del objeto (esto se llama "destructuring").
  const { organizationId, role, name } = await requireOrg()

  // "prisma.organization" es la tabla Organization en la base de datos.
  // ".findUnique()" busca exactamente UN registro.
  // "where: { id: organizationId }" es el filtro (como el WHERE de SQL).
  // "select: { name: true }" indica que solo queremos traer el campo "name",
  // no todos los campos de la tabla (para no desperdiciar datos).
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true }
  })

  // "org?.name" — el "?" se llama "optional chaining".
  // Significa: "si org existe, dame org.name; si org es null, dame undefined".
  // Así evitamos un crash si org no se encontró.
  const orgName = org?.name ?? 'Mi Organización'
  //                          ↑ "??" se llama "nullish coalescing".
  //                          Significa: "si lo de la izquierda es null o undefined,
  //                          usa el valor de la derecha como valor por defecto".

  // Las páginas de Next.js retornan JSX: código que parece HTML pero es JavaScript.
  // Los paréntesis después del "return" permiten escribir JSX en múltiples líneas.
  return (
    <div>
      {/* Las llaves {} dentro del JSX permiten ejecutar código JavaScript.
          Aquí mostramos el saludo y el nombre de la org. */}
      <h1>Hola, {orgName}</h1>
    </div>
  )
}
```

---

### 1.2 Client Component: El Recepcionista en la Mesa

Un Client Component empieza con `'use client'`. Corre en el navegador del usuario. Puede reaccionar a clics, pero **no puede hablar directamente con la base de datos**.

**Ejemplo real — `app/reservas/page.tsx`:**

```typescript
// Esta directiva en la primera línea le dice a Next.js:
// "Este componente corre en el navegador, no en el servidor".
'use client'

// "import" trae herramientas de otras librerías o archivos.
// "{ useState, useEffect }" importa SOLO esas dos funciones de React
// (no importa toda la librería, solo lo que necesitas).
import { useState, useEffect } from 'react'

// "export default function" declara y exporta la función principal del archivo.
// En Client Components, la función NO es "async" porque el navegador
// no puede pausar y esperar consultas a la base de datos.
export default function ReservasPage() {

  // "useState" es un "hook" (gancho) de React que crea una variable reactiva.
  // Cuando la variable cambia, la pantalla se actualiza automáticamente.
  // useState<Reservation[]> → TypeScript dice que el estado es un array de Reservations.
  // useState([]) → el valor inicial es un array vacío.
  // El hook devuelve dos cosas: [el valor actual, la función para cambiarlo]
  const [reservas, setReservas] = useState<Reservation[]>([])

  // Otro estado: un booleano para saber si el modal está abierto o cerrado.
  // false = cerrado por defecto.
  const [modalOpen, setModalOpen] = useState(false)

  // "useEffect" es un hook que ejecuta código cuando algo cambia.
  // El segundo parámetro [] (array vacío) significa: "ejecuta esto UNA sola vez
  // cuando el componente aparece en pantalla".
  useEffect(() => {
    // "fetch" es la función nativa del navegador para hacer llamadas HTTP.
    // Llama a nuestra propia API en /api/reservas.
    fetch('/api/reservas')
      // ".then()" encadena acciones: primero convierte la respuesta a JSON...
      .then(r => r.json())
      // ...y luego guarda los datos en el estado "reservas".
      .then(data => {
        // "setReservas" actualiza el estado. React re-renderiza la pantalla.
        setReservas(data.reservas)
      })
  }, []) // ← el [] vacío es el "array de dependencias": cuándo re-ejecutar el efecto.

  // Dentro del return, renderizamos la pantalla.
  return (
    <div>
      {/* "onClick" es un evento: ejecuta handleOpenNew cuando el usuario hace clic. */}
      <button onClick={() => setModalOpen(true)}>
        Nueva Reserva
      </button>

      {/* Renderizado condicional: si modalOpen es true, muestra el modal.
          El "&&" funciona como "SI esto es true, ENTONCES renderiza esto". */}
      {modalOpen && (
        <ReservaModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
```

---

### 1.3 Route Handler: La API del Proyecto

Los archivos `route.ts` en `app/api/` son los endpoints. Exportas funciones con el nombre del método HTTP.

**Ejemplo real — `app/api/reservas/[id]/route.ts`:**

```typescript
// Importamos tipos y herramientas de Next.js para manejar peticiones HTTP.
import { NextRequest, NextResponse } from 'next/server'

// Esta es la función que responde a GET /api/reservas/42.
// Recibe dos parámetros:
//   - req: la petición entrante (de tipo NextRequest)
//   - { params }: un objeto con los parámetros dinámicos de la URL
//     El [id] en la carpeta se convierte en el param "id".
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  //           ↑ Esto es TypeScript diciendo: "params es un Promise que
  //             cuando se resuelve, tiene un objeto con una propiedad 'id' de tipo string"
) {
  // "await params" espera que se resuelva el Promise.
  // "const { id }" extrae la propiedad "id" del objeto resultante.
  const { id } = await params

  // Busca la reserva en la base de datos.
  // "parseInt(id)" convierte el string "42" al número 42,
  // porque en la URL todo llega como texto.
  const reservation = await prisma.reservation.findUnique({
    where: { id: parseInt(id) },

    // "include" es como hacer JOINs en SQL: trae datos de tablas relacionadas.
    include: {
      guest: true,       // Trae todos los campos de la tabla Guest relacionada
      rooms: {
        // Puedes anidar includes: trae rooms, y dentro de cada room, también su room y su rate.
        include: { room: { include: { unitType: true } }, rate: true }
      },
      payments: { orderBy: { date: 'desc' } },  // Pagos ordenados del más nuevo al más viejo
    },
  })

  // Si no se encontró la reserva, respondemos con un error 404.
  if (!reservation) {
    // "NextResponse.json()" crea una respuesta HTTP con un body en formato JSON.
    // El segundo parámetro { status: 404 } define el código de estado HTTP.
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  // Si todo salió bien, respondemos con el objeto de la reserva.
  // Next.js lo convierte automáticamente a JSON.
  return NextResponse.json(reservation)
}

// Esta función maneja PATCH /api/reservas/42 (actualización parcial).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // "requireOrg()" lee la sesión del usuario y devuelve su organizationId.
  const { organizationId } = await requireOrg()

  // "req.json()" lee el cuerpo (body) de la petición HTTP y lo convierte a objeto JS.
  // Es lo que el frontend envió: { status: 'checked_out' }
  const body = await req.json()

  // "data: any" es TypeScript diciéndo "este objeto puede tener cualquier forma".
  // Luego vamos llenándolo condicionalmente.
  const data: any = {}

  // "body.status !== undefined" significa: "si el frontend envió el campo 'status'".
  // Solo actualizamos los campos que el frontend realmente envió.
  if (body.status !== undefined) data.status = body.status
  if (body.isVip !== undefined) data.isVip = body.isVip

  // Primero leemos el estado anterior de la reserva para poder compararlo después.
  const old = await prisma.reservation.findUnique({
    where: { id: parseInt(id) },
    select: { status: true }  // Solo necesitamos el status, no todo el objeto
  })

  // Actualizamos la reserva en la base de datos.
  const reservation = await prisma.reservation.update({
    where: { id: parseInt(id) },
    data,  // "data" es el objeto que armamos arriba con los campos a actualizar
  })

  // Comparamos el estado anterior con el nuevo.
  // "===" es igualdad estricta (compara valor Y tipo). Siempre usar este en lugar de "==".
  if (body.status === 'checked_out' && old?.status !== 'checked_out') {
    // Solo entra aquí si el estado cambió A 'checked_out' (no si ya lo era antes).
    // Aquí iría la lógica de marcar habitaciones como sucias y enviar notificaciones...
  }

  return NextResponse.json(reservation)
}
```

---

### 1.4 Server Actions: El Formulario que Habla con el Servidor

**Server Actions** son funciones marcadas con `'use server'` que el frontend puede llamar directamente sin necesitar una URL de API.

**Ejemplo real — `app/saas/nuevo/actions.ts`:**

```typescript
// Esta directiva le dice a Next.js:
// "Todas las funciones de este archivo corren en el servidor".
'use server'

import { prisma } from '@/lib/prisma'
// El "@/" es un alias que apunta a la raíz del proyecto.
// Es lo mismo que escribir "../../lib/prisma" pero más limpio.

import bcrypt from 'bcryptjs'
// "bcryptjs" es una librería para encriptar contraseñas.
// NUNCA se guarda una contraseña en texto plano en la base de datos.

// "FormData" es el tipo de TypeScript para los datos de un formulario HTML.
export async function createOrganization(formData: FormData) {

  // Protección: si quien llama no es superadmin, esta función lanza un error y para.
  await requireSuperAdmin()

  // "formData.get('orgName')" lee el campo llamado "orgName" del formulario.
  // "as string" es un "type cast" de TypeScript: le decimos que trate ese valor
  // como un string aunque TypeScript no esté 100% seguro.
  const orgName = formData.get('orgName') as string
  const orgSlug = formData.get('orgSlug') as string
  const adminPassword = formData.get('adminPassword') as string

  // Validación: si algún campo está vacío, retornamos un objeto de error
  // en lugar de continuar. "return" sale de la función inmediatamente.
  if (!orgName || !orgSlug) {
    return { error: 'Todos los campos son obligatorios' }
  }

  // "bcrypt.hash(password, 12)" genera un hash de la contraseña.
  // El 12 es el número de "rondas" de encriptación (más alto = más seguro, pero más lento).
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  // "try/catch" es un bloque de manejo de errores.
  // El código dentro de "try" se intenta ejecutar.
  // Si algo lanza un error, se captura en "catch" y podemos manejarlo.
  try {
    // "$transaction" es la operación todo-o-nada.
    // Si algo dentro falla, todo se revierte. Si todo sale bien, se confirma.
    await prisma.$transaction(async (tx) => {
      // "tx" es la conexión de transacción. Usamos "tx" en lugar de "prisma"
      // para que las operaciones formen parte de la misma transacción.

      // Paso 1: Crear la organización.
      const org = await tx.organization.create({
        data: { name: orgName, slug: orgSlug, plan: 'starter' }
      })
      // "org.id" tiene el ID generado automáticamente por la base de datos.

      // Paso 2: Crear el usuario admin ligado a esa organización.
      await tx.user.create({
        data: {
          organizationId: org.id,  // ← Conecta al usuario con la organización recién creada
          email: adminEmail,
          password: hashedPassword,  // La contraseña hasheada, nunca el texto plano
          role: 'admin',
          active: true
        }
      })
      // Si este paso falla, el paso 1 (crear la org) se deshace automáticamente. ✅
    })

    // "revalidatePath('/saas')" le dice a Next.js que el caché de la página /saas
    // está desactualizado. La próxima visita traerá datos frescos.
    revalidatePath('/saas')

    // Retornamos un objeto de éxito. El frontend puede leer esto.
    return { success: true }

  } catch (error: any) {
    // "error: any" le dice a TypeScript que el error puede ser de cualquier tipo.
    console.error('Error:', error)
    // Retornamos el error para que el frontend pueda mostrárselo al usuario.
    return { error: error.message || 'Error interno del servidor' }
  }
}
```

---

## 2. TypeScript: El Idioma Estricto

TypeScript le agrega "tipos" a JavaScript. Esto permite detectar errores antes de ejecutar el código.

**Sin TypeScript** este bug pasa desapercibido hasta que el usuario lo sufre:
```javascript
const reserva = { id: 1, guestName: "Juan" }
console.log(reserva.clientName)
// JavaScript devuelve "undefined" sin quejarse ← BUG SILENCIOSO
```

**Con TypeScript** el editor te avisa al instante:
```typescript
// "interface" define la forma (shape) que debe tener un objeto.
// Es como un contrato: "cualquier cosa que llame Reservation DEBE tener estos campos".
interface Reservation {
  id: number           // Debe ser un número entero
  status: string       // Debe ser texto
  guest: Guest         // Debe ser un objeto que cumpla la interface Guest
  rooms: ReservationRoom[]  // Debe ser un ARRAY de objetos ReservationRoom.
  //     ↑ El "[]" después del tipo significa "array de ese tipo"
  unitTotal: number
  totalPaid: number
}

// Declaramos que "reservas" es un array de objetos Reservation.
// "useState<Reservation[]>([])" tiene dos partes:
//   - "<Reservation[]>" es el tipo genérico: le dice a TypeScript qué tipo guarda el estado.
//   - "([])" es el valor inicial: un array vacío.
const [reservas, setReservas] = useState<Reservation[]>([])

// Ahora, si escribes reserva.clientName en cualquier parte del código,
// TypeScript te grita: ❌ "Property 'clientName' does not exist on type 'Reservation'"
```

**Tipos básicos de TypeScript:**
```typescript
let nombre: string = "Juan"     // Solo puede ser texto
let edad: number = 30            // Solo puede ser número
let activo: boolean = true       // Solo puede ser true o false
let tags: string[] = ["VIP"]    // Array de textos
let id: number | null = null     // Puede ser número O null (el "|" es "OR")

// "?" después del nombre del campo significa que es OPCIONAL (puede no existir)
interface Guest {
  firstName: string     // Obligatorio
  email?: string        // Opcional: puede ser string o undefined
  phone?: string | null // Puede ser string, undefined, o null
}
```

---

## 3. Prisma ORM: El Traductor a la Base de Datos

Prisma convierte código TypeScript a SQL sin que tengas que escribir SQL.

### El Schema: El Plano del Edificio

```prisma
// "model" define una tabla en la base de datos.
// Cada campo tiene: nombre, tipo, y modificadores opcionales.
model Organization {
  id    String  @id @default(cuid())
  //    ↑ tipo  ↑ es clave primaria  ↑ genera un ID único automáticamente
  name  String
  plan  String  @default("starter")
  //            ↑ valor por defecto si no se especifica al crear

  // Relación uno-a-muchos: una organización puede tener MUCHOS usuarios.
  // El "[]" significa que es una lista.
  // Este campo no existe en la BD; es un helper que Prisma usa para hacer JOINs.
  users User[]
}

model User {
  id             String @id @default(cuid())
  email          String @unique  // @unique: no puede haber dos usuarios con el mismo email
  organizationId String          // Esta columna SÍ existe en la BD como clave foránea

  // La relación inversa: dice cómo conectar User con Organization.
  // "fields: [organizationId]" → la columna de ESTA tabla
  // "references: [id]" → apunta a la columna "id" de Organization
  organization Organization @relation(fields: [organizationId], references: [id])

  // Índice: le dice a la BD que cree un índice para esta columna.
  // Hace las búsquedas "WHERE organizationId = X" mucho más rápidas.
  @@index([organizationId])
}
```

### Queries de Prisma explicadas línea por línea

**Crear un registro:**
```typescript
// "prisma.organization" apunta a la tabla Organization.
// ".create()" equivale a INSERT en SQL.
// El objeto "data" contiene los valores a insertar.
const org = await prisma.organization.create({
  data: {
    name: "Cabañas El Bosque",
    slug: "el-bosque"
    // "plan" no se pone porque tiene un @default("starter") en el schema
  }
})
// "org" es el objeto insertado, incluyendo su "id" recién generado.
console.log(org.id)  // "clxyz123..."
```

**Buscar uno con relaciones:**
```typescript
// ".findUnique()" busca exactamente UN registro que cumpla el "where".
// Si no existe, devuelve "null".
const reserva = await prisma.reservation.findUnique({
  where: { id: 42 },   // Filtra por id = 42 (el WHERE de SQL)

  // "include" hace JOINs y trae datos de tablas relacionadas.
  include: {
    guest: true,         // "true" = trae TODOS los campos de Guest
    rooms: {
      include: {
        // Puedes anidar: dentro de cada Room, trae también su UnitType
        room: { include: { unitType: true } },
        rate: true       // Y también su Rate
      }
    },
    payments: {
      // "orderBy" ordena los resultados. "desc" = del más nuevo al más viejo.
      orderBy: { date: 'desc' }
    }
  }
})
```

**Buscar muchos con filtros complejos:**
```typescript
// ".findMany()" devuelve un ARRAY de registros que cumplen el "where".
// Si no hay resultados, devuelve un array vacío [].
const arrivalsToday = await prisma.reservationRoom.findMany({
  where: {
    // Filtra que la room relacionada pertenezca a esta organización
    room: { organizationId },
    //     ↑ Shorthand: cuando el nombre de la variable y la clave son iguales,
    //       puedes escribir "organizationId" en vez de "organizationId: organizationId"

    // "gte" = greater than or equal (>=). "lte" = less than or equal (<=).
    arrival: { gte: todayStart, lte: todayEnd },

    // Filtra la reserva relacionada: que el status NO sea ninguno de esos valores.
    reservation: { status: { notIn: ['cancelled', 'blocked'] } }
  },
  include: {
    reservation: { include: { guest: true } },
    room: { include: { unitType: true } }
  },
  // "orderBy" con relaciones: ordena por el campo "sortOrder" de la tabla room relacionada.
  orderBy: { room: { sortOrder: 'asc' } }
  //                             ↑ "asc" = ascendente (de menor a mayor)
})
```

**Múltiples consultas en paralelo con `Promise.all`:**
```typescript
// Sin Promise.all, las consultas se ejecutan una tras otra (lento):
// Consulta 1 → 100ms → Consulta 2 → 100ms → ... → Total: 800ms

// Con Promise.all, se ejecutan TODAS al mismo tiempo:
// Todas en paralelo → Total: ~100ms (el tiempo de la más lenta)

// La sintaxis del "destructuring" en array:
// El primer elemento del resultado va a "arrivalsToday",
// el segundo a "departuresToday", etc.
const [
  arrivalsToday,
  departuresToday,
  checkedInReservations,
] = await Promise.all([
  // Estos tres prisma.findMany() se envían a la BD al mismo tiempo
  prisma.reservationRoom.findMany({ where: { arrival: hoy } }),
  prisma.reservationRoom.findMany({ where: { departure: hoy } }),
  prisma.reservation.findMany({ where: { status: 'checked_in' } }),
])
```

---

## 4. NextAuth.js: El Sistema de Portería

### El Flujo de Login (`auth.ts`)

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// "NextAuth()" configura el sistema de autenticación.
// "export const { handlers, auth, signIn, signOut }" extrae 4 funciones del resultado.
// Es destructuring de objeto: tomamos solo esas 4 funciones, no todo el objeto.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // "Credentials" es el proveedor de usuario+contraseña.
    Credentials({
      // "authorize" es la función que NextAuth llama cuando alguien intenta iniciar sesión.
      // Recibe "credentials" con los datos del formulario de login.
      // Devuelve el usuario si las credenciales son válidas, o "null" si no.
      async authorize(credentials) {

        // "credentials?.email" usa optional chaining:
        // Si credentials existe, dame credentials.email. Si es null, dame undefined.
        if (!credentials?.email || !credentials?.password) return null

        // Buscamos al usuario en la base de datos.
        // "select" especifica qué campos traer (como SELECT id, email FROM users).
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true, email: true, name: true,
            role: true, active: true, password: true,
            organizationId: true,
            // Podemos traer datos de relaciones también dentro del select
            organization: { select: { name: true, plan: true } }
          }
        })

        // "!user" es "NOT user": si user es null o undefined.
        // "!user.active" es "NOT active": si active es false.
        // "||" es OR: si CUALQUIERA de las dos condiciones es true, rechazamos.
        if (!user || !user.active) return null

        // "bcrypt.compare()" compara la contraseña ingresada con el hash guardado.
        // Devuelve true si coinciden, false si no.
        // NUNCA comparamos texto plano con texto plano.
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!valid) return null

        // Si llegamos aquí, las credenciales son correctas.
        // Retornamos el objeto que se guardará en la sesión del usuario.
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,  // ← El dato clave del Multi-Tenant
          orgName: user.organization.name,
        }
      }
    })
  ]
})
```

### El Middleware: El Guardia en la Puerta

```typescript
import { NextResponse } from 'next/server'

// "auth" envuelve nuestra función. NextAuth inyecta "req.auth" con la sesión.
export default auth((req) => {

  // "!!req.auth" convierte el valor a booleano.
  // "!!" es doble negación: si req.auth tiene algo, isLoggedIn = true.
  const isLoggedIn = !!req.auth

  // "req.auth?.user" — optional chaining: si req.auth existe, dame req.auth.user.
  // "(req.auth?.user as any)?.role" — el "as any" le dice a TypeScript que confíe en nosotros
  // aunque no sepa exactamente qué tipo tiene ese campo.
  const userRole = (req.auth?.user as any)?.role

  // "nextUrl.pathname" es la URL sin el dominio. Ej: "/dashboard" o "/saas"
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  // ".startsWith()" es un método de string que verifica si empieza con cierto texto.

  // Si NO está logueado Y la página NO es pública (login):
  if (!isLoggedIn && !isAuthPage) {
    // Lo redirigimos al login.
    // "new URL('/login', req.url)" construye la URL completa de login
    // basándose en el dominio actual (req.url).
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Si está logueado pero no es superadmin e intenta acceder a /saas:
  const isSaasRoute = req.nextUrl.pathname.startsWith('/saas')
  if (userRole !== 'superadmin' && isSaasRoute) {
    // Lo mandamos de regreso al dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Si ninguna condición aplica, dejamos pasar la petición normalmente.
  return NextResponse.next()
})

// "config.matcher" le dice al middleware en qué rutas debe activarse.
// Esta expresión regular excluye archivos estáticos (_next, favicon, imágenes).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
}
```

### El Helper `requireOrg()`: El Guardia Interno

```typescript
// lib/org.ts
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// Esta función se usa al inicio de cada Server Component o Route Handler
// para obtener los datos del usuario logueado.
export async function requireOrg() {
  // Obtiene la sesión actual (lee la cookie de sesión).
  const session = await auth()

  // Si no hay sesión (el usuario no está logueado):
  if (!session?.user) {
    // "redirect()" en Next.js lanza una excepción especial que Next.js captura
    // y usa para redirigir al usuario. Después de esto, el código para.
    redirect('/login')
  }

  // "as any" le dice a TypeScript: "confía en mí, sé que este campo existe".
  // Lo usamos porque NextAuth no sabe que agregamos campos custom como organizationId.
  const organizationId = (session.user as any).organizationId as string

  if (!organizationId) throw new Error('User has no organizationId')

  // Retornamos un objeto con todos los datos relevantes del usuario logueado.
  return {
    organizationId,                               // El ID de su hotel
    userId: session.user.id as string,            // Su ID personal
    role: (session.user as any).role as string,   // Su rol (admin, operator, etc.)
    name: session.user.name as string | undefined // Su nombre para mostrar
  }
}
```

---

## 5. CSS Modules: Estilos Sin Conflictos

Los archivos `.module.css` encapsulan los estilos. Los nombres de clase solo aplican al componente que los importa.

```css
/* reservas.module.css */

/* Un "selector de clase" empieza con punto.
   Esta clase aplica estilos visuales a los badges de estado. */
.statusBadge {
  padding: 4px 10px;       /* Espacio interno: 4px arriba/abajo, 10px izquierda/derecha */
  border-radius: 20px;     /* Bordes redondeados. 20px lo hace muy redondeado (tipo "pill") */
  font-size: 12px;         /* Tamaño del texto */
  font-weight: 600;        /* Grosor del texto: 400=normal, 600=semibold, 700=bold */
}

/* Cada estado tiene su propio color.
   Usamos variables CSS (--variable) en lugar de colores hardcodeados
   para que el sistema de temas funcione automáticamente. */
.statusBooked    { background: #fef3c7; color: #92400e; }  /* Amarillo */
.statusCheckedIn { background: #d1fae5; color: #065f46; }  /* Verde */
.statusCancelled { background: #fee2e2; color: #991b1b; }  /* Rojo */
```

```typescript
// En el componente, importamos los estilos como un objeto.
import styles from './reservas.module.css'

// Para combinar múltiples clases, usamos template literals (backticks ``).
// El ${} dentro de los backticks ejecuta código JavaScript.
// "styles.statusBadge" es la clase base, "styles.statusBooked" agrega el color.
<span className={`${styles.statusBadge} ${styles.statusBooked}`}>
  Reservado
</span>

// Next.js convierte ".statusBadge" a algo como ".reservas_statusBadge__Ax3b"
// para que no choque con otra clase ".statusBadge" en otro archivo.
```

### Variables CSS Globales (`globals.css`)

```css
/* :root selecciona el elemento raíz del HTML (la etiqueta <html>).
   Las variables definidas aquí están disponibles en TODO el proyecto. */
:root {
  /* Formato: --nombre-variable: valor; */
  --brand-500: #16a34a;           /* El verde principal del sistema */
  --surface-1: #1c1c1e;           /* Color de fondo de las tarjetas */
  --text-primary: #f5f5f7;        /* Color de texto principal (casi blanco) */
  --border: rgba(255,255,255,0.1); /* rgba() permite definir transparencia */
  /*                                   ↑ último valor es la opacidad: 0=invisible, 1=sólido */
}

/* Cuando el tema cambia a "light", sobreescribimos las variables.
   El resto del sistema no sabe nada del tema: solo lee las variables. */
[data-theme="light"] {
  --brand-500: #15803d;
  --surface-1: #ffffff;
  --text-primary: #1d1d1f;
}
```

En cualquier `.module.css` puedes usar:
```css
.miBoton {
  /* En vez de un color fijo, usas la variable. Se adapta al tema automáticamente. */
  background-color: var(--brand-500);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
```

---

## 6. Lucide React: Los Íconos

```typescript
// Importamos solo los íconos que necesitamos (no toda la librería).
// Esto reduce el tamaño del bundle final.
import { Calendar, Users, DollarSign, Trash2, Plus } from 'lucide-react'

// "size" define el tamaño en píxeles.
// "style" aplica CSS inline (solo para casos puntuales).
// "color" puede ir dentro de style o como prop directa según el ícono.
<DollarSign size={20} style={{ color: 'var(--brand-500)' }} />

// Dentro de un botón con texto, el ícono y el texto se ponen en línea:
<button className="btn btn-primary">
  <Plus size={16} />   {/* El ícono "+" */}
  Nueva Reserva        {/* El texto al lado */}
</button>
```

---

## 7. El Flujo Completo: Cómo se conecta todo

El recepcionista hace **checkout** de una reserva. Así viajan los datos:

```
1. [Usuario] Hace clic en "Checkout" en la reserva #42
        ↓
2. [Client Component] El evento onClick ejecuta la función handleCheckout(42):
   fetch('/api/reservas/42', {
     method: 'PATCH',                                ← Tipo de petición HTTP
     headers: { 'Content-Type': 'application/json' }, ← Avisa que el body es JSON
     body: JSON.stringify({ status: 'checked_out' })  ← Convierte el objeto a texto JSON
   })
        ↓
3. [middleware.ts] Lee la cookie de sesión → El usuario está logueado → OK
        ↓
4. [app/api/reservas/[id]/route.ts] Recibe el PATCH
        ↓
5. [requireOrg()] Lee la sesión → Extrae organizationId del hotel
        ↓
6. [Prisma] UPDATE reservation SET status='checked_out' WHERE id=42
        ↓
7. [Prisma] UPDATE rooms SET cleaningStatus='dirty' WHERE id IN (habitaciones de esa reserva)
        ↓
8. [WhatsApp] Envía mensaje a todos los admins con notifyWspCheckOut=true
        ↓
9. [Email / Resend] Envía email a todos los admins con notifyEmailCheckOut=true
        ↓
10. [Prisma] INSERT INTO auditlog (action='Estado: checked_in → checked_out')
        ↓
11. [Route Handler] return NextResponse.json({ id: 42, status: 'checked_out', ... })
        ↓
12. [Client Component] .then(data => { toast.success('Checkout realizado') })
        ↓
13. [Usuario] Ve el toast verde y la reserva con su nuevo estado ✅
```

---

## Resumen Final

> **Next.js** unifica el frontend (React) y el backend (API) en un solo proyecto. Usa **Server Components** cuando necesitas datos de la BD, **Client Components** cuando necesitas interactividad.
>
> **TypeScript** e **interfaces** garantizan que los datos siempre tienen la forma correcta. Detecta bugs antes de que el usuario los sufra.
>
> **Prisma** convierte código TypeScript a SQL de forma limpia. El `organizationId` en cada query es el corazón del **Multi-Tenant**: garantiza que los datos de cada hotel vivan completamente aislados.
>
> **NextAuth** controla quién puede entrar y a qué tiene acceso. El **middleware** protege todas las rutas de forma centralizada. `requireOrg()` es el "guardia interno" de cada página y API.
>
> **CSS Modules** encapsulan los estilos para que no se mezclen entre componentes. Las **variables CSS globales** permiten cambiar el tema completo cambiando solo unos pocos valores.
