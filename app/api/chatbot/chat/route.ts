import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, differenceInDays } from 'date-fns'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface AvailableOption {
  roomId: string
  roomCode: string
  roomName: string
  unitTypeName: string
  pricePerNight: number
  rateId: string
}

interface ChatState {
  step: 'start' | 'waiting_dates' | 'waiting_pax' | 'waiting_cabin' | 'waiting_guest_info' | 'confirming'
  arrival?: string      // 'YYYY-MM-DD'
  departure?: string    // 'YYYY-MM-DD'
  adults?: number
  children?: number
  pets?: number
  availableOptions?: AvailableOption[]
  selectedOptionIndex?: number
  guestInfo?: {
    firstName: string
    lastName: string
    rut: string
    email: string
    phone: string
  }
  // Conversational History for Gemini API Mode
  chatHistory?: any[]
  isAiMode?: boolean
}

function formatCLP(val: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(val)
}

// Months mapping for Spanish
const MONTHS_MAP: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, juno: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
}

// ── Smart Conversational Heuristics (Real Algarrobo Cabañas La Campiña Info) ──

// 1. FAQ Intent detection
function getFAQResponse(text: string): string | null {
  const clean = text.toLowerCase()
  
  if (clean.includes('asado') || clean.includes('quincho') || clean.includes('parrilla') || clean.includes('leña') || clean.includes('grill') || clean.includes('carbón') || clean.includes('carbon')) {
    return `🍖 *Quinchos y Asados:* Nuestras **cabañas cuentan con su propio quincho privado** y comedor en la terraza para preparar tus asados con total comodidad. Las **suites tienen acceso a un sector de quinchos grandes comunitarios** al aire libre. La bolsa de leña para el asado la puedes adquirir directamente en la recepción del recinto por **$5.000 la bolsa**. Importante: **la leña es exclusivamente para los asados y quinchos, no se utiliza para calefacción** (las cabañas no poseen chimeneas o estufas a leña).`
  }
  
  if (clean.includes('calefac') || clean.includes('estufa') || clean.includes('frío') || clean.includes('frio') || clean.includes('calor') || clean.includes('temperatura')) {
    return `🔥 *Calefacción:* En temporada de invierno, nuestras cabañas cuentan con **calefacción incluida** (estufa a gas o eléctrica según la unidad). Queremos destacar que **la leña es exclusivamente para el uso de los quinchos/asados, no para calefacción**, ya que no contamos con chimeneas o estufas a leña en los interiores.`
  }
  
  if (clean.includes('mascota') || clean.includes('perro') || clean.includes('gato') || clean.includes('animal') || clean.includes('pet')) {
    return `🐾 *Políticas de Mascotas:* ¡Somos Pet Friendly! **Aceptamos mascotas felices en nuestras cabañas**. Sin embargo, por razones de espacio y diseño, **NO se aceptan mascotas en las Suites**. El cargo adicional es de **$10.000 por noche** (cargo cobrado en base al catálogo de servicios de sanitización profunda del recinto).`
  }
  
  if (clean.includes('fumar') || clean.includes('cigarro') || clean.includes('cigarrillo') || clean.includes('tabaco') || clean.includes('humo')) {
    return `🚭 *Políticas de Humo:* Está estrictamente **PROHIBIDO fumar dentro de las cabañas y suites** (conforme a la Ley 20.660). En caso de no cumplir con esta ley, se realizará el **cobro total de la garantía ($20.000)** para cubrir los costos de lavado, limpieza y desinfección profunda del inmueble para devolverlo a un estado libre de humo.`
  }

  if (clean.includes('garantía') || clean.includes('garantia') || clean.includes('fianza') || clean.includes('depósito') || clean.includes('deposito')) {
    return `💰 *Garantía de Estadía:* Al ingresar, se debe dejar una **garantía de $20.000** (en efectivo o transferencia) por concepto de posibles daños, llaves o malas condiciones de entrega del alojamiento. Dicha garantía **se devuelve íntegramente durante el Check-out**, luego de realizar la revisión del inmueble.`
  }

  if (clean.includes('musica') || clean.includes('música') || clean.includes('ruido') || clean.includes('parlante') || clean.includes('ruidos') || clean.includes('volumen') || clean.includes('silencio') || clean.includes('bulla')) {
    return `🔇 *Normas de Ruidos y Música:* Somos cabañas familiares destinadas exclusivamente al descanso en la naturaleza.
• **No se permiten parlantes exteriores ni ruidos molestos** en todo el recinto.
• Se debe mantener la música dentro de las cabañas a volumen moderado o bajo.
• **En las suites está estrictamente prohibida la música** de cualquier tipo.
• Después de las **21:00 hrs**, se solicita silencio y bajar la voz en el exterior para garantizar el descanso de todos los huéspedes.`
  }

  if (clean.includes('checkin') || clean.includes('checkout') || clean.includes('check-in') || clean.includes('check-out') || clean.includes('horario') || clean.includes('llegada') || clean.includes('salida') || clean.includes('entrar') || clean.includes('salir')) {
    return `🕐 *Horarios oficiales de Check-in y Check-out:*
Los horarios de entrada y salida varían según la temporada del año:
• *Temporada Alta (Verano, Fiestas Patrias, Vacaciones de Invierno):* Check-in de 15:00 a 22:00 hrs | Check-out a las 11:00 hrs.
• *Temporada Media (Primavera, etc.):* Check-in de 14:00 a 21:00 hrs | Check-out a las 12:00 hrs.
• *Temporada Baja:* Check-in de 14:00 a 21:00 hrs | Check-out a las 12:30 hrs.
*(Si necesitas entrar o salir fuera del horario del portón, por favor avísanos con anticipación).*`
  }

  if (clean.includes('norma') || clean.includes('regla') || clean.includes('terminos') || clean.includes('términos') || clean.includes('condiciones') || clean.includes('reglamento')) {
    return `📋 *Normas Generales de Cabañas La Campiña:*
• **Check-in / Check-out:** Varía según temporada (Baja: 14:00-12:30, Media: 14:00-12:00, Alta: 15:00-11:00).
• **Garantía:** Fianza de **$20.000** reembolsable al Check-out.
• **Música:** Prohibida música en suites y parlantes exteriores. Silencio en el exterior después de las 21:00 hrs.
• **Tabaco:** Prohibido fumar en interiores (multa de la garantía completa).
• **Visitas:** Prohibidas visitas o personas no autorizadas al recinto.
• **Mascotas:** Solo en cabañas (con recargo de $10.000/noche). Prohibidas en suites y en zona de piscinas.
• **Servicios:** Vajilla debe quedar lavada al salir. No incluye aseo diario (Housekeeping).`
  }

  if (clean.includes('cancelar') || clean.includes('cancelacion') || clean.includes('cancelación') || clean.includes('devolucion') || clean.includes('devolución') || clean.includes('cambiar fecha') || clean.includes('cambio') || clean.includes('modificar') || clean.includes('modificacion') || clean.includes('modificación')) {
    return `📅 *Políticas de Cancelación y Cambios de Fecha:*
• **Cancelación con 100% de devolución:**
  - *Temporada Alta:* Avisar con un mínimo de **30 días** antes.
  - *Temporada Media:* Avisar con un mínimo de **20 días** antes.
  - *Temporada Baja:* Avisar con un mínimo de **14 días** antes.
• **Cancelación con 50% de devolución:**
  - *Temporada Alta:* Mínimo **15 días** antes.
  - *Temporada Media:* Mínimo **10 días** antes.
  - *Temporada Baja:* Mínimo **7 días** antes.
  *Si se cancela fuera de estos plazos, lamentablemente no se realiza devolución del abono.*
• **Modificaciones de Fecha:** El primer cambio es sin costo (siempre que respete los plazos de cancelación de 100%). Cambios adicionales tienen un costo administrativo de **$10.000**.`
  }
  
  if (clean.includes('wifi') || clean.includes('wi-fi') || clean.includes('internet') || clean.includes('conexion') || clean.includes('conexión') || clean.includes('cable') || clean.includes('tv')) {
    return `📶 *Conectividad:* Es importante destacar que **nuestras cabañas y suites no cuentan con conexión Wi-Fi**, ya que promovemos un ambiente de desconexión digital y descanso natural. Las cabañas y suites sí incluyen televisor con DirecTV.`
  }

  if (clean.includes('desayuno') || clean.includes('comida') || clean.includes('almuerzo') || clean.includes('cenar') || clean.includes('comer')) {
    return `🍳 *Servicios de Desayuno:* Ofrecemos un exquisito desayuno de campo premium llevado directamente a tu cabaña por **$8.000 por persona** (debes coordinarlo previamente en recepción).`
  }
  
  if (clean.includes('ubicado') || clean.includes('direccion') || clean.includes('donde') || clean.includes('como llegar') || clean.includes('mapa') || clean.includes('llegar') || clean.includes('playa') || clean.includes('algarrobo') || clean.includes('mirasol') || clean.includes('yeco')) {
    return `📍 *Ubicación y Playas:* Estamos ubicados en el hermoso sector de **Algarrobo-Mirasol** (Región de Valparaíso). Estamos a solo **400 metros de playas caminables** y espectaculares miradores (como Playa El Mirasol y Playa Grande El Yeco), y a solo unos minutos en auto de playas aptas para el baño (como El Canelo y El Canelillo).`
  }

  if (clean.includes('piscina') || clean.includes('pileta') || clean.includes('agua') || clean.includes('nadar') || clean.includes('bañarse')) {
    return `🏊 *Piscinas:* Contamos con hermosas piscinas al aire libre en el recinto, rodeadas de áreas verdes. Están habilitadas durante la temporada de verano (hasta Semana Santa).`
  }

  if (clean.includes('precio') || clean.includes('tarifa') || clean.includes('cuesta') || clean.includes('valor')) {
    return `💰 *Tarifas Base (CLP):* Disponemos de Cabañas 5 Personas ($95.000/noche), Cabañas 7 Personas ($120.000/noche) y 3 tipos de Suites para parejas (Standard: $65.000/noche, Deluxe: $80.000/noche y Superior: $95.000/noche).`
  }

  return null
}

// 2. Natural Date Parser
function extractDates(text: string): { arrival: string, departure: string } | null {
  const clean = text.toLowerCase().trim()
  const currentYear = 2026

  // 1. Check for two separate date patterns like "28 de mayo al 3 de junio" or "28 mayo a 3 junio" (include juno/setiembre typos)
  const datePattern = /(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|juno|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/gi
  const matches = [...clean.matchAll(datePattern)]
  
  if (matches.length >= 2) {
    const day1 = parseInt(matches[0][1])
    const monthName1 = matches[0][2]
    const monthIdx1 = MONTHS_MAP[monthName1]

    const day2 = parseInt(matches[1][1])
    const monthName2 = matches[1][2]
    const monthIdx2 = MONTHS_MAP[monthName2]

    if (monthIdx1 !== undefined && monthIdx2 !== undefined) {
      const arr = new Date(currentYear, monthIdx1, day1, 14, 0, 0, 0)
      const dep = new Date(currentYear, monthIdx2, day2, 12, 0, 0, 0)
      if (!isNaN(arr.getTime()) && !isNaN(dep.getTime()) && dep > arr) {
        return {
          arrival: `${arr.getFullYear()}-${String(arr.getMonth() + 1).padStart(2, '0')}-${String(arr.getDate()).padStart(2, '0')}`,
          departure: `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`
        }
      }
    }
  }

  // 2. Check for single month pattern like "del 28 al 31 de mayo" or "28 al 31 de mayo"
  const singleMonthPattern = /(?:del\s+|desde\s+)?(\d{1,2})\s*(?:al|a|hasta)\s*(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|juno|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i
  const singleMatch = clean.match(singleMonthPattern)
  
  if (singleMatch) {
    const day1 = parseInt(singleMatch[1])
    const day2 = parseInt(singleMatch[2])
    const monthName = singleMatch[3]
    const monthIdx = MONTHS_MAP[monthName]

    if (monthIdx !== undefined) {
      const arr = new Date(currentYear, monthIdx, day1, 14, 0, 0, 0)
      const dep = new Date(currentYear, monthIdx, day2, 12, 0, 0, 0)
      if (!isNaN(arr.getTime()) && !isNaN(dep.getTime()) && dep > arr) {
        return {
          arrival: `${arr.getFullYear()}-${String(arr.getMonth() + 1).padStart(2, '0')}-${String(arr.getDate()).padStart(2, '0')}`,
          departure: `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`
        }
      }
    }
  }

  // 3. Check for slash or dash dates like "28/05 al 31/05" or "28-05 al 31-05"
  const slashRegex = /(\d{1,2})[\/\-](\d{1,2})/g
  const slashMatches = [...clean.matchAll(slashRegex)]

  if (slashMatches.length >= 2) {
    const day1 = parseInt(slashMatches[0][1])
    const month1 = parseInt(slashMatches[0][2]) - 1
    const day2 = parseInt(slashMatches[1][1])
    const month2 = parseInt(slashMatches[1][2]) - 1

    const arr = new Date(currentYear, month1, day1, 14, 0, 0, 0)
    const dep = new Date(currentYear, month2, day2, 12, 0, 0, 0)
    if (!isNaN(arr.getTime()) && !isNaN(dep.getTime()) && dep > arr) {
      return {
        arrival: `${arr.getFullYear()}-${String(arr.getMonth() + 1).padStart(2, '0')}-${String(arr.getDate()).padStart(2, '0')}`,
        departure: `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`
      }
    }
  }

  return null
}

// 3. Natural PAX Parser
function extractPax(text: string, currentStep?: string): { adults?: number, children?: number, pets?: number } | null {
  const clean = text.toLowerCase()
  
  // Clean all dates and month patterns from the text prior to extracting passenger count
  // to prevent date numbers (like "10" in "10 de junio" or "10 de juno") from being parsed as pax.
  let textWithoutDates = clean
    .replace(/(?:del\s+|desde\s+)?\d{1,2}\s*(?:al|a|hasta)\s*\d{1,2}\s*(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|juno|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/gi, '')
    .replace(/\d{1,2}\s*(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|juno|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}/g, '')

  const numberMatches = textWithoutDates.match(/\d+/g)
  if (!numberMatches) return null

  let adults: number | undefined
  let children: number | undefined
  let pets: number | undefined

  const segments = textWithoutDates.split(/[,y\s]+/)
  segments.forEach((seg, idx) => {
    const num = parseInt(seg)
    if (!isNaN(num)) {
      const prevWord = idx > 0 ? segments[idx - 1] : ''
      const nextWord = idx < segments.length - 1 ? segments[idx + 1] : ''
      
      const context = (prevWord + ' ' + nextWord).toLowerCase()
      
      if (context.includes('niño') || context.includes('niña') || context.includes('hijo') || context.includes('chico') || context.includes('child') || context.includes('infante')) {
        children = num
      } else if (context.includes('mascota') || context.includes('perro') || context.includes('gato') || context.includes('pet')) {
        pets = num
      } else if (context.includes('adulto') || context.includes('pax') || context.includes('persona') || context.includes('grande')) {
        adults = num
      }
    }
  })

  // Fallback: only parse plain numbers when we are in the explicit PAX question step, OR if it's extremely short text (less than 15 chars) without other contexts
  if (adults === undefined) {
    const isWaitingPax = currentStep === 'waiting_pax'
    const isVeryShort = textWithoutDates.trim().length < 15
    
    if (isWaitingPax || isVeryShort) {
      adults = parseInt(numberMatches[0])
      if (numberMatches.length >= 2) children = parseInt(numberMatches[1])
      if (numberMatches.length >= 3) pets = parseInt(numberMatches[2])
    }
  }

  if (adults !== undefined || children !== undefined || pets !== undefined) {
    return { adults, children, pets }
  }

  return null
}

// 4. Natural Guest Info Parser
function extractGuestInfo(text: string): { firstName?: string, lastName?: string, rut?: string, email?: string, phone?: string } | null {
  const clean = text.toLowerCase()
  const parts = text.split(/[,;\n]+/).map(p => p.trim())
  
  let firstName: string | undefined
  let lastName: string | undefined
  let rut: string | undefined
  let email: string | undefined
  let phone: string | undefined

  parts.forEach((part) => {
    if (part.includes('@')) {
      email = part
    } else if (part.includes('+56') || (part.match(/^\d+$/) && part.length >= 8) || part.startsWith('9')) {
      phone = part
    } else if (part.match(/\d+[\.\-]/) || part.toLowerCase().includes('rut') || part.match(/^\d{7,8}-[\dkK]$/)) {
      rut = part.replace(/rut:?/i, '').trim()
    } else if (part.length > 2 && !firstName) {
      const alphabeticOnly = part.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim()
      if (alphabeticOnly.length > 3) {
        const nameParts = alphabeticOnly.split(/\s+/)
        firstName = nameParts[0]
        lastName = nameParts.slice(1).join(' ') || 'La Campiña'
      }
    }
  })

  if (firstName || rut || email || phone) {
    return { firstName, lastName, rut, email, phone }
  }
  return null
}

// ── HEURISTIC/FALLBACK LOCAL BOT ENGINE ───────────────────────────
function runHeuristicBot(message: string, state: ChatState) {
  const text = message.trim()
  const cleanText = text.toLowerCase()

  // Global reset keywords
  if (cleanText === 'reiniciar' || cleanText === 'salir' || cleanText === 'cancelar') {
    return {
      message: '¡Asistente virtual de **Cabañas La Campiña** reiniciado! 🌲\n\n¿En qué fechas y para cuántas personas deseas cotizar? *(Ejemplo: "Quiero una cabaña del 28 al 31 de mayo para 2 adultos")*.\n\nTambién puedes consultarme sobre quinchos y asados, si aceptamos mascotas, Wi-Fi, ubicación o piscinas.',
      state: { step: 'waiting_dates' }
    }
  }

  // casual greeting check
  const casualGreetings = ['hola como estas', 'hola, como estas', 'como estas', 'que tal', 'buenos dias', 'buenas tardes', 'buenas noches', 'hola bot', 'hola!', 'hola']
  const isCasualGreeting = casualGreetings.some(g => cleanText.startsWith(g)) || cleanText === 'hola'
  
  if (isCasualGreeting && !state.arrival && !state.departure && !state.adults) {
    return {
      message: '¡Hola! Qué gusto saludarte. Estoy muy bien, muchas gracias por preguntar. 😊🌲\n\nSoy el conserje virtual de **Cabañas La Campiña en Algarrobo**. Estoy listo para responder tus dudas sobre el recinto (quinchos, mascotas, playas cercanas, etc.) o ayudarte a reservar de forma orgánica.\n\n¿Te gustaría hacer una cotización o tienes alguna duda específica?',
      state: { ...state, step: 'waiting_dates' }
    }
  }

  if (cleanText === 'quiero cotizar' || cleanText === 'cotizar' || cleanText === 'quiero reservar') {
    return {
      message: '¡Excelente! Vamos a realizar tu cotización.\n\n¿En qué fechas te gustaría visitarnos? Por favor, indícame el día de llegada y de salida *(ejemplo: "del 28 al 31 de mayo")*.',
      state: { ...state, step: 'waiting_dates' }
    }
  }

  // A. FAQ Response Check
  const faqResponse = getFAQResponse(text)

  // B. Real-time parameter extraction from user inputs
  const parsedDates = extractDates(text)
  const parsedPax = extractPax(text, state.step)
  const parsedGuest = extractGuestInfo(text)

  // Update active state based on extracted values
  const updatedState = { ...state }
  
  if (parsedDates) {
    updatedState.arrival = parsedDates.arrival
    updatedState.departure = parsedDates.departure
  }
  
  if (parsedPax) {
    if (parsedPax.adults !== undefined) updatedState.adults = parsedPax.adults
    if (parsedPax.children !== undefined) updatedState.children = parsedPax.children
    if (parsedPax.pets !== undefined) updatedState.pets = parsedPax.pets
  }

  if (parsedGuest) {
    updatedState.guestInfo = {
      firstName: parsedGuest.firstName || updatedState.guestInfo?.firstName || 'Pasajero',
      lastName: parsedGuest.lastName || updatedState.guestInfo?.lastName || 'La Campiña',
      rut: parsedGuest.rut || updatedState.guestInfo?.rut || '—',
      email: parsedGuest.email || updatedState.guestInfo?.email || 'correo@temporade.cl',
      phone: parsedGuest.phone || updatedState.guestInfo?.phone || '+56900000000'
    }
  }

  // If currently confirming, handle yes/no intents
  if (updatedState.step === 'confirming') {
    if (cleanText === 'sí' || cleanText === 'si' || cleanText === 'confirmar' || cleanText === 'confirmo') {
      return {
        message: 'confirm_execution',
        state: updatedState
      }
    }
  }

  // Dynamic Option selection in waiting_cabin step
  if (updatedState.step === 'waiting_cabin' && !faqResponse && !parsedDates && !parsedPax) {
    const idx = parseInt(text) - 1
    const options = updatedState.availableOptions || []
    
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      updatedState.selectedOptionIndex = idx
      updatedState.step = 'waiting_guest_info'
      
      return {
        message: `¡Excelente elección! Has seleccionado **${options[idx].unitTypeName} (${options[idx].roomName})**.\n\nPara registrar la reserva, necesito los datos de contacto.\n\nPor favor, indícame tu **Nombre y Apellido, RUT, Correo Electrónico y Teléfono** en un solo mensaje *(ejemplo: "Juan Perez, 12.345.678-9, juan@gmail.com, +56998765432")*.`,
        state: updatedState
      }
    }
  }

  // CHECK MISSING VARIABLES & CONSTRUCT REPLY CONVERSATIONALLY
  
  // Case 1: We don't have dates yet
  if (!updatedState.arrival || !updatedState.departure) {
    let reply = ''
    if (faqResponse) {
      reply += `${faqResponse}\n\n`
    }
    
    reply += `¿En qué fechas les gustaría hospedarse y para cuántas personas sería la cotización en Algarrobo? *(Ejemplo: "Queremos ir del 28 al 31 de mayo para 2 adultos")*`
    updatedState.step = 'waiting_dates'
    
    return { message: reply, state: updatedState }
  }

  // Case 2: We have dates, but no PAX yet
  if (updatedState.adults === undefined) {
    let reply = ''
    if (faqResponse) {
      reply += `${faqResponse}\n\n`
    }
    
    const arrD = new Date(updatedState.arrival)
    const depD = new Date(updatedState.departure)
    const nights = differenceInDays(depD, arrD)

    reply += `¡Entendido! Fechas registradas para el **${updatedState.arrival}** al **${updatedState.departure}** (${nights} noches).\n\n¿Para cuántas personas (adultos y niños) planean venir? *(ejemplo: "Somos 2 adultos y 1 niño")*`
    updatedState.step = 'waiting_pax'
    
    return { message: reply, state: updatedState }
  }

  // Case 3: We have dates and PAX, let's fetch available cabins!
  if (updatedState.selectedOptionIndex === undefined) {
    return {
      message: 'needs_availability_fetch',
      state: updatedState
    }
  }

  // Case 4: Cabin is selected, but we don't have guest info yet
  if (!updatedState.guestInfo) {
    let reply = ''
    if (faqResponse) {
      reply += `${faqResponse}\n\n`
    }

    const selected = updatedState.availableOptions?.[updatedState.selectedOptionIndex ?? 0]
    reply += `Tengo registrada tu opción: **${selected?.unitTypeName} (${selected?.roomName})**.\n\nPara registrar la reserva en la recepción de La Campiña, por favor indícame tu **Nombre y Apellido, RUT, Correo Electrónico y Teléfono** en un solo mensaje *(ejemplo: "Juan Perez, 12.345.678-9, juan@gmail.com, +56998765432")*.`
    updatedState.step = 'waiting_guest_info'
    
    return { message: reply, state: updatedState }
  }

  // Case 5: All values gathered, show confirmation summary!
  const selected = updatedState.availableOptions?.[updatedState.selectedOptionIndex ?? 0]
  const guest = updatedState.guestInfo
  const [arrYr, arrMo, arrDy] = updatedState.arrival.split('-').map(Number)
  const [depYr, depMo, depDy] = updatedState.departure.split('-').map(Number)
  const arrivalDate = new Date(arrYr, arrMo - 1, arrDy, 14, 0, 0, 0)
  const departureDate = new Date(depYr, depMo - 1, depDy, 12, 0, 0, 0)
  const nights = differenceInDays(departureDate, arrivalDate)
  const totalCost = (selected?.pricePerNight ?? 0) * nights

  updatedState.step = 'confirming'

  let reply = ''
  if (faqResponse) {
    reply += `${faqResponse}\n\n`
  }

  reply += `¡Excelente! He recopilado todos tus datos de forma orgánica.\n\nResumen de tu Cotización:\n━━━━━━━━━━━━━━━━━━━\n👤 **Huésped:** ${guest.firstName} ${guest.lastName}\n🆔 **RUT:** ${guest.rut}\n📧 **Correo:** ${guest.email}\n📱 **Teléfono:** ${guest.phone}\n\n🏠 **Unidad:** ${selected?.unitTypeName} (${selected?.roomName})\n📅 **Estadía:** ${updatedState.arrival} al ${updatedState.departure} (${nights} noches)\n👥 **Pasajeros:** ${updatedState.adults} adultos, ${updatedState.children || 0} niños, ${updatedState.pets || 0} mascotas\n💰 **Total a Pagar:** ${formatCLP(totalCost)}\n━━━━━━━━━━━━━━━━━━━\n\n¿Confirmas que los datos son correctos para registrar tu reserva en el calendario? Escribe **SÍ** o **CONFIRMAR** para agendar.`

  return { message: reply, state: updatedState }
}

// ── GEMINI AI AGENT SYSTEM PROMPT ────────────────────────────────
const SYSTEM_INSTRUCTION = `
Eres "Campiña AI", el conserje y recepcionista virtual de "Cabañas La Campiña" ubicadas en el hermoso sector de Mirasol en Algarrobo, Región de Valparaíso, Chile. 
Tu rol es asistir a los huéspedes de forma cálida, cercana, atenta y 100% profesional, hablando siempre en español de Chile (cercano pero muy respetuoso, usando términos como '¡Hola!', '¿Cómo estás?', '¡Qué gusto!', etc.).

INFORMACIÓN OFICIAL Y EXCLUSIVA DE CABAÑAS LA CAMPIÑA (Úsala estrictamente para responder FAQs):
1. Ubicación y Entorno:
   - Sector Algarrobo-Mirasol. A 400 metros caminando de miradores y espectaculares playas como Playa El Mirasol y Playa Grande El Yeco. A solo unos minutos en auto de playas aptas para el baño como El Canelo y El Canelillo.
2. Tipos de Alojamiento y Tarifas Base:
   - Cabañas para 5 Personas: $95.000 por noche. Tienen quincho privado y terraza. Sí aceptan mascotas.
   - Cabañas para 7 Personas: $120.000 por noche. Tienen quincho privado y terraza. Sí aceptan mascotas.
   - Suites Matrimoniales (Parejas, máx 2 personas):
     - Suite Standard: $65.000 por noche. No incluye cocina ni hervidor (sí frigobar). No acepta mascotas. Quinchos grandes exteriores comunitarios.
     - Suite Deluxe: $80.000 por noche. En 2do piso con balcón y hermosa vista a la piscina. No acepta mascotas.
     - Suite Superior: $95.000 por noche. En 1er piso con vista al jardín y una tina/ducha expuesta frente a la cama. No acepta mascotas.
3. Política de Mascotas:
   - ¡Somos Pet Friendly! Se aceptan mascotas (pequeñas y medianas) ÚNICAMENTE en las cabañas pagando un adicional de $10.000 por noche (por sanitización).
   - En las suites NO se aceptan mascotas por diseño y espacio. Las mascotas deben usar correa y tienen prohibido el ingreso al área de piscinas.
4. Quinchos, Asados y Leña:
   - Las cabañas cuentan con quincho privado en la terraza. Las suites acceden a un gran quincho comunitario.
   - La bolsa de leña para el asado se adquiere en recepción por $5.000 la bolsa.
   - ¡MUY IMPORTANTE!: La leña es única y exclusivamente para los quinchos/asados. La calefacción interior en invierno viene incluida (es a gas o eléctrica según la cabaña). No hay estufas o chimeneas a leña en los interiores.
5. Conectividad y Entretenimiento:
   - Promovemos un espacio de desconexión y relajo natural: NO hay conexión Wi-Fi en cabañas ni suites. Sí se incluye televisor con DirecTV.
6. Piscinas:
   - Piscinas al aire libre en áreas verdes, habilitadas durante la temporada de verano (desde diciembre hasta Semana Santa).
7. Horarios oficiales de Check-in y Check-out por Temporada:
   - Temporada Alta (Verano, Fiestas Patrias, Vacaciones de Invierno): Check-in de 15:00 a 22:00 hrs | Check-out a las 11:00 hrs.
   - Temporada Media (Primavera, etc.): Check-in de 14:00 a 21:00 hrs | Check-out a las 12:00 hrs.
   - Temporada Baja: Check-in de 14:00 a 21:00 hrs | Check-out a las 12:30 hrs.
8. Fianza / Garantía obligatoria:
   - En el check-in se solicita una garantía obligatoria de $20.000 en efectivo o transferencia por posibles daños o pérdida de llaves. Se devuelve íntegramente al hacer el check-out tras revisar el alojamiento.
9. Ruidos y Convivencia:
   - Cabañas familiares de descanso. Prohibidos ruidos molestos o parlantes exteriores. Música permitida en interiores a volumen moderado/bajo. En las suites está prohibida la música. A partir de las 21:00 hrs se solicita silencio absoluto en el exterior.
10. Cancelación y Cambios de Fecha:
    - Cancelación (100% de devolución): Avisar mínimo 30 días antes en temporada alta, 20 días en media y 14 días en baja.
    - Cancelación (50% de devolución): Avisar mínimo 15 días antes en alta, 10 días en media y 7 días en baja.
    - Cambios de fecha: Primer cambio sin costo. Cambios adicionales tienen un costo administrativo de $10.000.

HERRAMIENTAS Y FUNCIONAMIENTO CONVERSACIONAL:
- Si el usuario te saluda, salúdalo cálidamente y ponte a su disposición para resolver dudas o cotizar una estadía.
- Si el usuario desea cotizar/reservar:
  1. Identifica o pregúntale de manera amable la fecha de llegada, fecha de salida y cantidad total de pasajeros.
  2. Cuando tengas estos datos, debes llamar obligatoriamente a la función "verificar_disponibilidad". No asumas disponibilidad por tu cuenta ni la inventes.
  3. Muestra las cabañas o suites disponibles que te devuelva la función de forma ordenada, atractiva y con sus tarifas. Pregúntale cuál prefiere.
  4. Una vez elegida la cabaña, pídele amigablemente sus datos de contacto para el registro (Nombre y Apellido, RUT, Correo, Teléfono). Puedes pedirselo todo junto o ir guiándolo.
  5. Cuando tengas los datos, resume toda la cotización de forma hermosa (Huésped, fechas, noches, cabaña elegida, pasajeros y valor total en CLP) y pídele confirmación explícita (si confirma con un sí o un de acuerdo).
  6. Si el huésped confirma explícitamente, llama a la función "registrar_reserva" para insertar la reserva real en la base de datos SQLite y dale su número de reserva correspondiente celebrando el éxito de la gestión.
`;

// Declaraciones de Funciones para Gemini
const verificarDisponibilidadDeclaration: any = {
  name: 'verificar_disponibilidad',
  description: 'Verifica y consulta disponibilidad de cabañas y suites en tiempo real en la base de datos de Cabañas La Campiña para un rango de fechas y cantidad de pasajeros.',
  parameters: {
    type: 'OBJECT' as any,
    properties: {
      fecha_llegada: {
        type: 'STRING' as any,
        description: 'Fecha de llegada / Check-in en formato YYYY-MM-DD (ej: "2026-06-10")'
      },
      fecha_salida: {
        type: 'STRING' as any,
        description: 'Fecha de salida / Check-out en formato YYYY-MM-DD (ej: "2026-06-15")'
      },
      total_pasajeros: {
        type: 'INTEGER' as any,
        description: 'Cantidad total de huéspedes que viajan (adultos + niños)'
      }
    },
    required: ['fecha_llegada', 'fecha_salida', 'total_pasajeros']
  }
}

const registrarReservaDeclaration: any = {
  name: 'registrar_reserva',
  description: 'Crea, inserta y registra una reserva real y confirmada en la base de datos SQLite para Cabañas La Campiña.',
  parameters: {
    type: 'OBJECT' as any,
    properties: {
      habitacion_id: {
        type: 'STRING' as any,
        description: 'ID único de la habitación/cabaña seleccionada'
      },
      fecha_llegada: {
        type: 'STRING' as any,
        description: 'Fecha de llegada (YYYY-MM-DD)'
      },
      fecha_salida: {
        type: 'STRING' as any,
        description: 'Fecha de salida (YYYY-MM-DD)'
      },
      adultos: {
        type: 'INTEGER' as any,
        description: 'Cantidad de adultos'
      },
      niños: {
        type: 'INTEGER' as any,
        description: 'Cantidad de niños'
      },
      mascotas: {
        type: 'INTEGER' as any,
        description: 'Cantidad de mascotas'
      },
      nombre_huesped: {
        type: 'STRING' as any,
        description: 'Nombre de pila del huésped'
      },
      apellido_huesped: {
        type: 'STRING' as any,
        description: 'Apellido del huésped'
      },
      rut_huesped: {
        type: 'STRING' as any,
        description: 'RUT o Pasaporte del huésped'
      },
      email_huesped: {
        type: 'STRING' as any,
        description: 'Correo electrónico de contacto'
      },
      telefono_huesped: {
        type: 'STRING' as any,
        description: 'Teléfono o celular del huésped'
      }
    },
    required: [
      'habitacion_id', 'fecha_llegada', 'fecha_salida', 'adultos',
      'nombre_huesped', 'apellido_huesped', 'rut_huesped', 'email_huesped', 'telefono_huesped'
    ]
  }
}

// ── MAIN ROUTE HANDLER ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, state: inputState } = await req.json()
    const state: ChatState = inputState || { step: 'start' }
    const text = message.trim()

    // ── DUAL MODE: LOCAL BOT FALLBACK OR TRUE GEMINI AI AGENT ────────
    const isGeminiApiKeyPresent = !!process.env.GEMINI_API_KEY

    if (!isGeminiApiKeyPresent) {
      // 1. Local Heuristic Bot Mode
      const heuristicResult = runHeuristicBot(message, state)
      const updatedState = heuristicResult.state

      // Technical interceptor: if availability fetch or confirmation execution are needed, do them here!
      if (heuristicResult.message === 'needs_availability_fetch') {
        const arrivalStr = updatedState.arrival || '2026-05-28'
        const departureStr = updatedState.departure || '2026-05-31'
        const [arrYr, arrMo, arrDy] = arrivalStr.split('-').map(Number)
        const [depYr, depMo, depDy] = departureStr.split('-').map(Number)
        const arrivalDate = new Date(arrYr, arrMo - 1, arrDy, 14, 0, 0, 0)
        const departureDate = new Date(depYr, depMo - 1, depDy, 12, 0, 0, 0)
        const totalPax = (updatedState.adults || 1) + (updatedState.children || 0)

        const overlappingRooms = await prisma.reservationRoom.findMany({
          where: {
            reservation: { status: { notIn: ['cancelled', 'blocked'] } },
            OR: [{ arrival: { lt: departureDate }, departure: { gt: arrivalDate } }]
          },
          select: { roomId: true }
        })
        const occupiedRoomIds = overlappingRooms.map(r => r.roomId)

        const availableRooms = await prisma.room.findMany({
          where: {
            active: true,
            id: { notIn: occupiedRoomIds },
            unitType: { maxOccupancy: { gte: totalPax } }
          },
          include: { unitType: true, defaultRate: true },
          orderBy: { sortOrder: 'asc' }
        })

        if (availableRooms.length === 0) {
          return NextResponse.json({
            message: `Lo sentimos, no disponemos de cabañas o suites libres para ${totalPax} personas del ${arrivalStr} al ${departureStr}.\n\n¿Deseas probar buscando para otras fechas? Escribe las nuevas fechas.`,
            state: { step: 'waiting_dates' }
          })
        }

        const options: AvailableOption[] = []
        const uniqueUnitTypeIds = new Set<string>()

        availableRooms.forEach((room) => {
          if (!uniqueUnitTypeIds.has(room.unitTypeId) && room.defaultRate) {
            uniqueUnitTypeIds.add(room.unitTypeId)
            options.push({
              roomId: room.id,
              roomCode: room.code,
              roomName: room.name.replace(/^[a-z]-/i, ''),
              unitTypeName: room.unitType.name,
              pricePerNight: room.defaultRate.rackRate,
              rateId: room.defaultRate.id
            })
          }
        })

        updatedState.availableOptions = options
        updatedState.step = 'waiting_cabin'

        let reply = `¡Perfecto! Sí tenemos disponibilidad en Algarrobo para **${totalPax} huéspedes** del ${arrivalStr} al ${departureStr}.\n\nHé aquí las opciones recomendadas:\n\n`
        options.forEach((opt, idx) => {
          reply += `*${idx + 1}*️⃣ **${opt.unitTypeName}**\n   • Cabaña/Suite: ${opt.roomName}\n   • Tarifa por noche: ${formatCLP(opt.pricePerNight)}\n\n`
        })
        reply += `Por favor, responde con el número de la opción que prefieres reservar (*1*, *2*, etc.).`

        return NextResponse.json({ message: reply, state: updatedState })
      }

      if (heuristicResult.message === 'confirm_execution') {
        const options = updatedState.availableOptions || []
        const selIdx = updatedState.selectedOptionIndex ?? 0
        const selected = options[selIdx]
        const guest = updatedState.guestInfo || { firstName: 'Pasajero', lastName: 'La Campiña', rut: '—', email: 'correo@temporade.cl', phone: '+56900000000' }

        const arrivalStr = updatedState.arrival || '2026-05-28'
        const departureStr = updatedState.departure || '2026-05-31'
        const [arrYr, arrMo, arrDy] = arrivalStr.split('-').map(Number)
        const [depYr, depMo, depDy] = departureStr.split('-').map(Number)
        const arrivalDate = new Date(arrYr, arrMo - 1, arrDy, 14, 0, 0, 0)
        const departureDate = new Date(depYr, depMo - 1, depDy, 12, 0, 0, 0)
        const nights = differenceInDays(departureDate, arrivalDate)
        const totalCost = (selected?.pricePerNight ?? 0) * nights

        let dbGuest = await prisma.guest.findFirst({
          where: { OR: [{ rut: guest.rut }, { email: guest.email }] }
        })

        if (!dbGuest) {
          dbGuest = await prisma.guest.create({
            data: {
              firstName: guest.firstName,
              lastName: guest.lastName,
              rut: guest.rut,
              email: guest.email,
              phone: guest.phone,
              nationality: 'Chile',
              tags: '[]',
              totalStays: 1
            }
          })
        } else {
          dbGuest = await prisma.guest.update({
            where: { id: dbGuest.id },
            data: { totalStays: { increment: 1 } }
          })
        }

        const reservation = await prisma.reservation.create({
          data: {
            guestId: dbGuest.id,
            status: 'booked',
            adults: updatedState.adults || 1,
            children: updatedState.children || 0,
            pets: updatedState.pets || 0,
            unitTotal: totalCost,
            totalPaid: 0,
            notes: 'Creado automáticamente vía Chatbot de WhatsApp (Simulador Real Campiña)',
            rooms: {
              create: {
                roomId: selected.roomId,
                rateId: selected.rateId,
                arrival: arrivalDate,
                departure: departureDate,
                nights: nights,
                adults: updatedState.adults || 1,
                children: updatedState.children || 0,
                unitRate: selected.pricePerNight,
                unitTotal: totalCost
              }
            },
            auditLogs: {
              create: {
                action: 'Reserva creada',
                details: 'Registrada automáticamente por el Chatbot Real.'
              }
            }
          }
        })

        return NextResponse.json({
          message: `🎉 **¡Excelente! Tu reserva ha sido registrada con éxito.**\n\n*Número de Reserva:* **Rsv #${reservation.id}**\n🏠 *Unidad:* ${selected.unitTypeName} (${selected.roomName})\n📅 *Estadía:* ${updatedState.arrival} al ${updatedState.departure} (${nights} noches)\n💰 *Total a pagar:* ${formatCLP(totalCost)}\n👤 *Huésped:* ${guest.firstName} ${guest.lastName}\n\n¡Te esperamos en Cabañas La Campiña en Algarrobo! 🌲🌊`,
          state: { step: 'start', isAiMode: false },
          action: 'reservation_created',
          reservationId: reservation.id
        })
      }

      // Normal Local response
      updatedState.isAiMode = false
      return NextResponse.json({ message: heuristicResult.message, state: updatedState })
    }

    // 2. TRUE GEMINI AI AGENT MODE
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [
        {
          functionDeclarations: [verificarDisponibilidadDeclaration, registrarReservaDeclaration]
        }
      ]
    })

    // Prepare content history
    const geminiHistory = state.chatHistory || []
    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.4
      }
    })

    // Reset instruction inside user chat stream if requested
    const cleanText = text.toLowerCase().trim()
    if (cleanText === 'reiniciar' || cleanText === 'salir' || cleanText === 'cancelar') {
      return NextResponse.json({
        message: '¡Asistente virtual de **Cabañas La Campiña** reiniciado! 🌲\n\n¿En qué fechas y para cuántas personas deseas cotizar? *(Ejemplo: "Quiero una cabaña del 28 al 31 de mayo para 2 adultos")*.\n\nTambién puedes consultarme sobre quinchos y asados, si aceptamos mascotas, Wi-Fi, ubicación o piscinas.',
        state: { step: 'start', chatHistory: [], isAiMode: true }
      })
    }

    let responseResult = await chat.sendMessage(text)
    let aiText = responseResult.response.text()
    let action: string | undefined
    let reservationId: number | undefined

    // Loop for handling tool calls (up to 3 turns for safety)
    let loopCount = 0
    let functionCalls = responseResult.response.functionCalls()

    while (functionCalls && functionCalls.length > 0 && loopCount < 3) {
      loopCount++
      const call = functionCalls[0]
      const name = call.name
      const args: any = call.args

      let toolOutput: any

      if (name === 'verificar_disponibilidad') {
        const arrivalStr = args.fecha_llegada
        const departureStr = args.fecha_salida
        const totalPax = Number(args.total_pasajeros || 1)

        try {
          const [arrYr, arrMo, arrDy] = arrivalStr.split('-').map(Number)
          const [depYr, depMo, depDy] = departureStr.split('-').map(Number)
          const arrivalDate = new Date(arrYr, arrMo - 1, arrDy, 14, 0, 0, 0)
          const departureDate = new Date(depYr, depMo - 1, depDy, 12, 0, 0, 0)

          const overlappingRooms = await prisma.reservationRoom.findMany({
            where: {
              reservation: { status: { notIn: ['cancelled', 'blocked'] } },
              OR: [{ arrival: { lt: departureDate }, departure: { gt: arrivalDate } }]
            },
            select: { roomId: true }
          })
          const occupiedRoomIds = overlappingRooms.map(r => r.roomId)

          const availableRooms = await prisma.room.findMany({
            where: {
              active: true,
              id: { notIn: occupiedRoomIds },
              unitType: { maxOccupancy: { gte: totalPax } }
            },
            include: { unitType: true, defaultRate: true },
            orderBy: { sortOrder: 'asc' }
          })

          const options: AvailableOption[] = []
          const uniqueUnitTypeIds = new Set<string>()

          availableRooms.forEach((room) => {
            if (!uniqueUnitTypeIds.has(room.unitTypeId) && room.defaultRate) {
              uniqueUnitTypeIds.add(room.unitTypeId)
              options.push({
                roomId: room.id,
                roomCode: room.code,
                roomName: room.name.replace(/^[a-z]-/i, ''),
                unitTypeName: room.unitType.name,
                pricePerNight: room.defaultRate.rackRate,
                rateId: room.defaultRate.id
              })
            }
          })

          toolOutput = {
            success: true,
            arrival: arrivalStr,
            departure: departureStr,
            totalPax: totalPax,
            availableRooms: options.map(opt => ({
              habitacion_id: opt.roomId,
              nombre_unidad: opt.unitTypeName,
              cabaña_suite: opt.roomName,
              precio_por_noche: opt.pricePerNight,
              precio_por_noche_formateado: formatCLP(opt.pricePerNight)
            }))
          }
        } catch (err: any) {
          toolOutput = { success: false, error: 'Error al consultar disponibilidad: ' + err.message }
        }
      } 
      else if (name === 'registrar_reserva') {
        const roomId = args.habitacion_id
        const arrivalStr = args.fecha_llegada
        const departureStr = args.fecha_salida
        const adults = Number(args.adultos || 1)
        const children = Number(args.niños || 0)
        const pets = Number(args.mascotas || 0)
        const firstName = args.nombre_huesped
        const lastName = args.apellido_huesped
        const rut = args.rut_huesped
        const email = args.email_huesped
        const phone = args.telefono_huesped

        try {
          const [arrYr, arrMo, arrDy] = arrivalStr.split('-').map(Number)
          const [depYr, depMo, depDy] = departureStr.split('-').map(Number)
          const arrivalDate = new Date(arrYr, arrMo - 1, arrDy, 14, 0, 0, 0)
          const departureDate = new Date(depYr, depMo - 1, depDy, 12, 0, 0, 0)
          const nights = differenceInDays(departureDate, arrivalDate)

          const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { unitType: true, defaultRate: true }
          })

          if (!room || !room.defaultRate) {
            throw new Error('Cabaña no encontrada o sin tarifa activa.')
          }

          const totalCost = room.defaultRate.rackRate * nights

          let dbGuest = await prisma.guest.findFirst({
            where: { OR: [{ rut: rut }, { email: email }] }
          })

          if (!dbGuest) {
            dbGuest = await prisma.guest.create({
              data: {
                firstName: firstName,
                lastName: lastName,
                rut: rut,
                email: email,
                phone: phone,
                nationality: 'Chile',
                tags: '[]',
                totalStays: 1
              }
            })
          } else {
            dbGuest = await prisma.guest.update({
              where: { id: dbGuest.id },
              data: { totalStays: { increment: 1 } }
            })
          }

          const reservation = await prisma.reservation.create({
            data: {
              guestId: dbGuest.id,
              status: 'booked',
              adults: adults,
              children: children,
              pets: pets,
              unitTotal: totalCost,
              totalPaid: 0,
              notes: 'Creado por Agente Conversacional Real Campiña AI con Inteligencia Artificial',
              rooms: {
                create: {
                  roomId: room.id,
                  rateId: room.defaultRate.id,
                  arrival: arrivalDate,
                  departure: departureDate,
                  nights: nights,
                  adults: adults,
                  children: children,
                  unitRate: room.defaultRate.rackRate,
                  unitTotal: totalCost
                }
              },
              auditLogs: {
                create: {
                  action: 'Reserva creada',
                  details: 'Registrada con IA Generativa Gemini 1.5.'
                }
              }
            }
          })

          action = 'reservation_created'
          reservationId = reservation.id
          toolOutput = {
            success: true,
            reservationId: reservation.id,
            codigo_reserva: `Rsv #${reservation.id}`,
            totalCost: totalCost,
            totalCostFormated: formatCLP(totalCost)
          }
        } catch (err: any) {
          toolOutput = { success: false, error: 'Error al registrar la reserva: ' + err.message }
        }
      }

      // Send function response back to Gemini to get conversational text
      responseResult = await chat.sendMessage([
        {
          functionResponse: {
            name: name,
            response: toolOutput
          }
        }
      ])
      aiText = responseResult.response.text()
      functionCalls = responseResult.response.functionCalls()
    }

    const updatedHistory = await chat.getHistory()

    return NextResponse.json({
      message: aiText,
      state: {
        ...state,
        chatHistory: updatedHistory,
        isAiMode: true
      },
      action,
      reservationId
    })

  } catch (err: any) {
    console.error('Error in dual-mode chatbot route:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
