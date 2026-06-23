import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { searchKnowledge } from '@/lib/assistant-knowledge'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SCORE_THRESHOLD = 2 // If local score >= this, skip AI call

const SYSTEM_PROMPT = `Eres el asistente interno de "Campiña Planner", un sistema de gestión hotelera (PMS).
Responde de forma breve y directa en español. Máximo 3 oraciones.

El sistema tiene estos módulos:
- Dashboard (/dashboard): resumen del día, KPIs, ocupación
- Recepción (/recepcion): check-in, check-out, llegadas y salidas del día
- Calendario (/calendario): vista Gantt de ocupación por habitación
- Reservas (/reservas): crear, editar, cancelar reservas y registrar pagos
- Habitaciones (/habitaciones): estado de limpieza por unidad
- Huéspedes (/huespedes): CRM, historial, tags VIP
- Pizarra (/pizarra): memos y avisos internos entre el personal
- Inventario (/inventario): stock de insumos y costos
- Reportes (/reportes/financiero|habitaciones|huespedes|inventario|fechas): estadísticas y exportación
- Administración (/administracion): configuración de la organización
- Configuración > Tarifas (/setup/tarifas), Unidades (/setup/unidades), Habitaciones (/setup/rooms), Amenities (/setup/amenities), Usuarios (/setup/usuarios), WhatsApp Bot (/setup/whatsapp)
- SaaS (/saas): panel exclusivo superadmin para gestionar clientes del SaaS

REGLA MUY IMPORTANTE: No tienes acceso a la base de datos real. Si el usuario te pregunta por datos específicos (ej: "quién ingresó el 10 de julio", "cuántas reservas hay mañana", "busca al huésped Juan"), NUNCA inventes datos. Debes responderle cortésmente indicándole CÓMO buscar esa información y guiarlo al módulo correcto (ej: "Para ver los ingresos de un día específico, dirígete al Calendario o filtra la tabla en Reservas.").

Responde SOLO con JSON en este formato exacto, sin markdown:
{"answer":"tu respuesta aquí","route":"/ruta-opcional","routeLabel":"Nombre del módulo opcional"}
Si no hay ruta relevante, omite los campos route y routeLabel.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  // 1. Try local knowledge base first
  const local = searchKnowledge(query)
  if (local && local.score >= SCORE_THRESHOLD) {
    return NextResponse.json({
      answer: local.entry.answer,
      route: local.entry.route,
      routeLabel: local.entry.routeLabel,
      source: 'local',
    })
  }

  // 2. Fallback to Gemini Flash (free tier)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // If no API key, return the best local match we have (even if low score)
    if (local) {
      return NextResponse.json({ answer: local.entry.answer, route: local.entry.route, routeLabel: local.entry.routeLabel, source: 'local' })
    }
    return NextResponse.json({ answer: 'No encontré información sobre eso. Intenta reformular tu pregunta.', source: 'local' })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
    })
    const result = await model.generateContent(query)
    const text = result.response.text().trim()

    // Strip markdown code fences if model wraps JSON
    const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ ...parsed, source: 'ai' })
  } catch {
    // If AI fails, return best local result
    if (local) {
      return NextResponse.json({ answer: local.entry.answer, route: local.entry.route, routeLabel: local.entry.routeLabel, source: 'local' })
    }
    return NextResponse.json({ answer: 'No encontré información sobre eso. Intenta reformular tu pregunta.', source: 'local' })
  }
}
