# WhatsApp Bot Microservice

Este es el microservicio encargado de mantener abierta la sesión de WhatsApp Web mediante la librería `whatsapp-web.js`.

Debido a que Next.js en Vercel es un entorno serverless (sin estado persistente), no puede ejecutar navegadores Chromium para mantener WebSockets abiertos 24/7. Por lo tanto, este bot debe estar alojado en un servicio en la nube como Render o Railway.

## Instrucciones de Despliegue en Render.com

1. **Crear el Web Service:**
   - Inicia sesión en Render.com y haz clic en "New Web Service".
   - Conecta tu repositorio de GitHub donde tienes Campiña Planner.
   
2. **Configuración del Web Service:**
   - **Name:** `campina-whatsapp-bot` (o el nombre que prefieras).
   - **Root Directory:** `whatsapp-bot` *(Muy importante, para que Render sepa que debe iniciar solo este bot y no la app entera).*
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`

3. **Variables de Entorno (Environment Variables):**
   Agrega las siguientes variables en la sección "Environment" de Render:
   - `API_KEY`: Una contraseña segura (ej: `campina-secret-key-123`). Esta misma contraseña debe ir en el archivo `.env` de tu Next.js como `WHATSAPP_API_KEY`.
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: `true` (Render provee Chrome nativamente, por lo que no es necesario descargar Chromium de Puppeteer).
   - `PUPPETEER_EXECUTABLE_PATH`: `/usr/bin/google-chrome`

4. **Desplegar:**
   - Haz clic en "Create Web Service".
   - Una vez desplegado, copia la URL que te da Render (ej: `https://campina-whatsapp-bot.onrender.com`).
   - Pega esa URL en tu archivo `.env` de Next.js como `WHATSAPP_API_URL`.

5. **Escanear el Código QR:**
   - Ve a la página de Configuración > WhatsApp Bot en tu SaaS de Campiña Planner.
   - Si todo salió bien, verás el código QR allí listo para escanear con el celular corporativo.
