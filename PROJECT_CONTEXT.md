# Contexto del Proyecto: Campiña Planner

## Descripción General
Campiña Planner es un software SaaS (Property Management System) de gestión hotelera y de alojamientos (cabañas, hoteles, etc.) desarrollado en Next.js. El sistema está diseñado con una arquitectura **Multi-Tenant**, donde cada cliente o alojamiento se representa como una `Organization` y los datos se aíslan mediante el `organizationId`.

## Stack Tecnológico
- **Framework:** Next.js 14+ (App Router), React 19, TypeScript.
- **Estilos / UI:** CSS Modules/Tailwind, Lucide React (iconos), y un enfoque estricto en UI/UX definido en las reglas del proyecto.
- **Base de Datos:** PostgreSQL utilizando **Prisma ORM**.
- **Autenticación:** NextAuth.js (v5 beta) con `@auth/prisma-adapter` y credenciales con `bcryptjs`.
- **Librerías Clave:**
  - `@dnd-kit/core` y asociados (Manejo de Drag and Drop, posiblemente en el calendario).
  - `recharts` (Para la visualización de gráficos y métricas).
  - `exceljs` y `jspdf` (Para la generación y exportación de reportes).
  - `resend` (Servicio de envío de correos transaccionales).
  - WhatsApp Bot (Integración de un bot de WhatsApp, manejado en la carpeta `whatsapp-bot`).

## Estructura de Datos (Prisma Models)
La arquitectura de la base de datos es robusta e incluye:
- **Core SaaS:** `Organization`, `SaasPayment`, `SaasEvent` (Gestión de los clientes que pagan el software).
- **Usuarios y Acceso:** `User` (Con roles definidos: superadmin, admin, operator, observer) y registro de auditoría (`AuditLog`).
- **CRM y Huespedes:** `Guest` (Registro histórico de pasajeros, tags como VIP o ruidoso).
- **Configuración Hotelera:** `UnitType` (Tipos de cabaña/habitación), `Room` (Habitaciones físicas), `Rate` (Tarifas), `Amenity` (Servicios extra).
- **Reservas:** `Reservation`, `ReservationRoom` (Relación que permite alojar una reserva en múltiples habitaciones/fechas).
- **Finanzas:** `Payment`, `Extra`.
- **Operaciones:** `InventoryItem`, `InventoryTransaction` (Control de stock y gastos), `Memo` (Notas y recordatorios de recepción).
- **WhatsApp:** `WhatsAppSession` (Gestión de estado del bot).

## Estructura de Rutas y Módulos (`/app`)
La interfaz está dividida en los siguientes módulos principales, cada uno manejando su propia ruta dentro del App Router:
- `/dashboard`: Panel de indicadores principales.
- `/calendario`: Interfaz visual tipo Gantt/Grilla para ver ocupación.
- `/recepcion` y `/pizarra`: Pantallas orientadas a la operación diaria de turnos y tareas.
- `/reservas`, `/habitaciones`, `/huespedes`: Gestión del core de hospedaje.
- `/inventario`: Control de stock (limpieza, amenidades) y sus costos.
- `/reportes`: Estadísticas financieras y operativas.
- `/administracion` y `/setup`: Configuración específica de cada organización (tarifas, usuarios, cabañas).
- `/saas`: Panel superadmin exclusivo para gestionar pagos e inquilinos del SaaS.

## Reglas y Convenciones Clave (Referencia de AGENTS.md)
1. **Layouts de Directorio:** El menú lateral y la estructura de navegación (`AppLayout`) no están a nivel global, sino que **se aplican individualmente en el `layout.tsx` de cada módulo**. Toda pestaña nueva debe envolverse con este componente.
2. **Filosofía Ponytail (Lazy Senior Dev):** Priorizar código aburrido pero eficiente. Evitar abstracciones innecesarias, preferir la API nativa y usar menos dependencias.
3. **UI/UX Pro Max:** Restricciones estrictas de contraste, espaciado de 8dp, feedback de interacción (ripples, etc.), evitar uso de emojis en favor de iconos SVG de `lucide-react`.

Este documento sirve como ancla de contexto para los agentes IA a la hora de realizar análisis, refactorizaciones o agregar nuevas características.
