Arquitectura del Proyecto: Cómo se estructura Campiña Planner
Entender la arquitectura de un proyecto es como entender los planos de un centro comercial. Necesitas saber por dónde entra la gente, dónde están las tiendas (Frontend), dónde están las bodegas (Backend) y cómo se comunican los vendedores con los bodegueros.

En un proyecto tradicional, el Frontend y el Backend son dos edificios separados en ciudades distintas. En Next.js (el framework que usamos), ambos viven en el mismo edificio.

1. Frontend vs Backend: ¿Qué son exactamente aquí?
🎨 El Frontend (El Escaparate y las Mesas)
Es todo lo que ocurre dentro del navegador del usuario (Google Chrome, Safari, el celular).

Su trabajo: Mostrar botones, colores, animaciones, escuchar los clics del mouse y mostrar modales.
Limitación: Es inseguro. Cualquiera puede presionar F12 en su navegador y ver el código del Frontend. Por eso, jamás se ponen contraseñas de bases de datos aquí.
En tu código: Cualquier archivo que empiece con 'use client' y todos los archivos .module.css.
⚙️ El Backend (La Cocina y la Bóveda)
Es todo lo que ocurre en el servidor de Vercel (la computadora remota donde vive tu página).

Su trabajo: Conectarse a la base de datos (Supabase), validar contraseñas, enviar correos electrónicos y calcular reportes financieros pesados.
Ventaja: Es 100% seguro. El usuario jamás ve este código, solo ve el resultado que este código escupe.
En tu código: Los archivos de la carpeta app/api/, los Server Components (como vimos en el archivo anterior) y Prisma.
2. El Archivo Madre y el Despliegue en Cascada
Cuando un usuario escribe campinaplanner.cl/dashboard en su navegador, el sistema no carga todo al azar. Sigue una jerarquía estricta, de afuera hacia adentro, como pelar una cebolla.

Nivel 0: El Guardia de Seguridad (middleware.ts)
Antes de que se cargue cualquier archivo visual, la petición choca contra el middleware.ts.

¿Qué hace? Revisa si el usuario tiene una sesión activa (login). Si no la tiene, corta la comunicación ahí mismo y lo redirige a la pantalla de login. ¡El resto de la aplicación ni se entera de que alguien intentó entrar!
Nivel 1: El Archivo Madre (app/layout.tsx)
Si el guardia lo deja pasar, Next.js carga el Root Layout (el diseño raíz). Este es el archivo padre de toda la aplicación. Es el molde base.

typescript

// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {/* Aquí se inyecta el contenido de la página que el usuario pidió */}
        {children} 
        
        {/* Aquí ponemos cosas que DEBEN estar en TODAS las pantallas del sistema, 
            como el sistema de notificaciones flotantes (Toaster) */}
        <Toaster />
      </body>
    </html>
  )
}
Nivel 2: Los Sub-Layouts (app/dashboard/layout.tsx)
A veces, una sección entera comparte un diseño. Por ejemplo, todas las páginas del sistema interno comparten la barra de navegación lateral (Sidebar). En lugar de copiar y pegar el código del menú en cada página, existe un sub-layout.

typescript

// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="layout-con-menu">
      <MenuLateral />        {/* El menú de navegación izquierdo */}
      <main>{children}</main> {/* Aquí adentro va la página específica */}
    </div>
  )
}
Nivel 3: La Página (app/dashboard/page.tsx)
Finalmente, llegamos al destino. El código de la página se inyecta dentro del sub-layout, que a su vez está inyectado dentro del archivo madre.

Flujo en cascada visual:

html

<html> <!-- Nivel 1: Root Layout -->
  <body>
    <div class="layout-con-menu"> <!-- Nivel 2: Dashboard Layout -->
      <MenuLateral />
      <main>
        
        <h1>Hola, Recepción</h1> <!-- Nivel 3: La Página (page.tsx) -->
      
      </main>
    </div>
  </body>
</html>
3. La Sinergia: ¿Cómo se comunican el Front y el Back?
Como en Next.js el Front y el Back viven en el mismo proyecto, tienen 3 formas increíbles de comunicarse. Esta es la sinergia que hace que la app sea rápida.

Método A: El servidor entrega el plato listo (Server Components)
Esta es la forma principal y más rápida.

El usuario pide la URL /dashboard.
El servidor (Back) va a la base de datos, obtiene las reservas, calcula la ocupación y "pinta" el HTML completo.
El servidor le envía al navegador (Front) el HTML final.
Sinergia: El navegador no tuvo que pensar ni hacer cálculos, solo mostró la página al instante.
Método B: El Front hace una llamada telefónica al Back (Fetch a APIs)
Esta es la forma tradicional cuando necesitas interactividad después de que la página ya cargó.

El usuario ya está en /reservas (Front).
Hace clic en un botón que dice "Ver reservas de Mañana".
El componente de React (Front) usa la función fetch('/api/reservas?dia=manana') para "llamar por teléfono" al Back.
El archivo app/api/reservas/route.ts (Back) contesta, busca en la base de datos y responde con un archivo de texto JSON [{ id: 1, ... }].
El Front recibe el JSON y actualiza la tabla en la pantalla sin recargar la página entera.
Método C: El túnel secreto (Server Actions)
Esta es la tecnología más moderna de Next.js, usada en formularios (como cuando creas un nuevo cliente en /saas/nuevo).

Tienes un formulario en el Front.
En lugar de crear una API (Método B) y hacer un fetch, simplemente le pasas al botón de Guardar una función que vive en el Back (marcada con 'use server').
Sinergia: Next.js crea un puente invisible automáticamente. Tú sientes que estás llamando a una función normal de JavaScript, pero Next.js agarra los datos del formulario, los envía al servidor, ejecuta la creación en la base de datos, y te devuelve el éxito al Front, ¡todo sin que tengas que programar la comunicación HTTP manualmente!
Resumen del Viaje de la Arquitectura
La Petición: El navegador pide entrar.
El Guardia (middleware.ts): Verifica quién es y si tiene llave.
El Cascarón (layout.tsx): Prepara el HTML básico y el menú lateral.
El Cerebro (page.tsx - Backend): Obtiene los datos críticos de Prisma.
Los Músculos (Componentes React - Frontend): Se encargan de que si el usuario hace clic en "Eliminar Reserva", se envíe la orden al backend (/api/...) y la pantalla se actualice.
La Base de Datos (Supabase): El gran archivo en el sótano que todos consultan.