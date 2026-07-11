/* eslint-disable @typescript-eslint/no-explicit-any, react/no-danger */
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Bot, 
  MessageSquare, 
  RotateCcw, 
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './simulador.module.css'
import Link from 'next/link'
import DOMPurify from 'dompurify'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot' | 'system'
  time: string
}

interface ChatState {
  step: 'start' | 'waiting_dates' | 'waiting_pax' | 'waiting_cabin' | 'waiting_guest_info' | 'confirming'
  arrival?: string
  departure?: string
  adults?: number
  children?: number
  pets?: number
  availableOptions?: Array<{
    roomId: string
    roomCode: string
    roomName: string
    unitTypeName: string
    pricePerNight: number
    rateId: string
  }>
  selectedOptionIndex?: number
  guestInfo?: {
    firstName: string
    lastName: string
    rut: string
    email: string
    phone: string
  }
  isAiMode?: boolean
  chatHistory?: any[]
}

export default function SimuladorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [chatState, setChatState] = useState<ChatState>({ step: 'start' })
  const [botTyping, setBotTyping] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [createdRsvId, setCreatedRsvId] = useState<number | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, botTyping])

  // Initialize bot greeting on mount
  useEffect(() => {
    const initializeChat = async () => {
      setBotTyping(true)
      try {
        const res = await fetch('/api/chatbot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hola', state: { step: 'start' } })
        })
        if (!res.ok) throw new Error('Chatbot init failed')
        const data = await res.json()
        setMessages([
          {
            id: 'init',
            text: data.message,
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
        setChatState(data.state)
      } catch (err) {
        console.error('[chatbot] init error:', err)
        toast.error('Error al inicializar el chatbot')
        setMessages([
          {
            id: 'err',
            text: '❌ No se pudo conectar con el servidor del chatbot. Revisa que tu conexión esté activa.',
            sender: 'system',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
      } finally {
        setBotTyping(false)
      }
    }

    initializeChat()
  }, [])

  // Send message handler
  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim()
    if (!text) return
    
    // Clear input
    setInputValue('')

    // 1. Add User Message
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      text,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, userMsg])
    setBotTyping(true)

    try {
      // 2. Call Chatbot API
      const res = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, state: chatState })
      })

      if (!res.ok) throw new Error('Error en el bot')
      const data = await res.json()

      // 3. Add Bot Message
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        text: data.message,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      setMessages(prev => [...prev, botMsg])
      setChatState(data.state)

      // 4. Check for actions (e.g. reservation created)
      if (data.action === 'reservation_created' && data.reservationId) {
        setCreatedRsvId(data.reservationId)
        setCelebrate(true)
        toast.success(`¡Reserva #${data.reservationId} creada con éxito! 🎉`, { duration: 5000 })
      }
    } catch (err) {
      console.error('[chatbot] send error:', err)
      toast.error('El chatbot tuvo un problema al responder')
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          text: '⚠️ Ocurrió un error al enviar el mensaje. Escribe "reiniciar" para volver a intentar.',
          sender: 'system',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setBotTyping(false)
    }
  }

  // Reset chatbot session
  const handleReset = async () => {
    setBotTyping(true)
    setCelebrate(false)
    setCreatedRsvId(null)
    try {
      const res = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'reiniciar', state: chatState })
      })
      const data = await res.json()
      setMessages([
        {
          id: `reset-${Date.now()}`,
          text: data.message,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
      setChatState(data.state)
      toast.success('Conversación reiniciada')
    } catch (err) {
      console.error('[chatbot] reset error:', err)
      toast.error('No se pudo reiniciar')
    } finally {
      setBotTyping(false)
    }
  }

  // Parse markdown-like **bold** text and split into blocks
  const formatMessageText = (text: string) => {
    if (!text) return ''
    // Strip any pre-existing HTML tags from server text, then apply only bold/italic
    // ponytail: bot text is server-controlled but we sanitize defensively
    const stripped = text.replace(/<[^>]*>/g, '')
    let html = stripped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

    return html.split('\n').map((line, idx) => {
      // ponytail: lines come from splitting bot text — no stable ID exists
      // eslint-disable-next-line react/no-array-index-key
      return (
        <span
          key={`line-${idx}-${line.slice(0, 10)}`}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line) }}
          style={{ display: 'block', minHeight: line === '' ? '12px' : 'auto' }}
        />
      )
    })
  }

  // Chat Suggestion Chips
  const getSuggestions = () => {
    switch (chatState.step) {
      case 'waiting_dates':
        return [
          '🔥 ¿Cómo es la calefacción?', 
          '🐾 ¿Aceptan mascotas?', 
          '🚭 ¿Se puede fumar?',
          '💰 ¿Hay que dejar garantía?',
          '🔇 ¿Cómo es el tema del ruido?',
          '🕐 Horarios Check-in/out', 
          '📅 Quiero cotizar'
        ]
      case 'waiting_pax':
        return ['2 adultos y 1 niño', '4 personas y 1 perro', 'Solo 2 adultos']
      case 'waiting_cabin':
        return ['1', '2', 'Cancelar']
      case 'waiting_guest_info':
        return ['Andres Muñoz, 18.234.567-k, andres@gmail.com, +56998765432', 'Cancelar']
      case 'confirming':
        return ['SÍ', 'CONFIRMAR', 'Reiniciar']
      default:
        return ['Hola, ¿cómo estás?', '🚭 ¿Se puede fumar?', '💰 ¿Hay que dejar garantía?', '📅 Quiero cotizar']
    }
  }

  return (
    <div className={styles.simuladorContainer}>
      
      {/* Celebration Overlay if Reservation Created */}
      {celebrate && createdRsvId && (
        <div className={styles.celebrateOverlay}>
          <div className={styles.celebrateCard}>
            <Sparkles className={styles.celebrateIcon} size={48} />
            <h2>¡Reserva Registrada Exitosamente!</h2>
            <p>El chatbot simulado ha creado exitosamente la reserva **Rsv #{createdRsvId}** en la base de datos.</p>
            <div className={styles.celebrateActions}>
              <Link href="/calendario" className="btn btn-primary btn-sm" onClick={() => setCelebrate(false)}>
                Ver en Calendario <ArrowRight size={14} style={{ marginLeft: 4 }} />
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={() => setCelebrate(false)}>
                Seguir Chateando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Left Column (Chat Screen) | Right Column (Database Monitor Panel) */}
      <div className={styles.layoutGrid}>
        
        {/* LEFT COLUMN: WhatsApp Interface Mock */}
        <div className={styles.chatWrapper}>
          
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.botAvatar}>
                <Bot size={20} />
              </div>
              <div>
                <h3 className={styles.botName}>
                  Asistente Virtual {chatState.isAiMode ? 'AI 🧠' : 'Local ⚡'} <span className={styles.verifiedBadge}>✓</span>
                </h3>
                <span className={styles.onlineIndicator}>
                  {chatState.isAiMode ? (
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>🟢 Modo AI Gemini Activo</span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>🟡 Modo Local (Heurístico)</span>
                  )}
                  {" · En línea"}
                </span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleReset} title="Reiniciar chat">
              <RotateCcw size={16} style={{ marginRight: 6 }} /> Reiniciar
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className={styles.messagesContainer}>
            
            {/* Informational Message */}
            <div className={styles.systemBanner}>
              <MessageSquare size={14} />
              <span>
                {chatState.isAiMode ? (
                  <strong>🧠 Conectado a Google Gemini 1.5 Flash. Chatea orgánicamente y reserva en tiempo real.</strong>
                ) : (
                  <span>⚡ Sandbox de WhatsApp. Agrega <code>GEMINI_API_KEY</code> a tu <code>.env</code> para activar la IA orgánica de Gemini.</span>
                )}
              </span>
            </div>

            {/* List */}
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot'
              const isSys = msg.sender === 'system'
              let rowClass = styles.rowUser
              if (isBot) rowClass = styles.rowBot
              else if (isSys) rowClass = styles.rowSys

              let bubbleClass = styles.bubbleUser
              if (isBot) bubbleClass = styles.bubbleBot
              else if (isSys) bubbleClass = styles.bubbleSys
              return (
                <div
                  key={msg.id}
                  className={`${styles.messageRow} ${rowClass}`}
                >
                  <div className={`${styles.messageBubble} ${bubbleClass}`}>
                    <div className={styles.messageText}>
                      {formatMessageText(msg.text)}
                    </div>
                    <span className={styles.messageTime}>{msg.time}</span>
                  </div>
                </div>
              )
            })}

            {/* Bot Typing Indicator */}
            {botTyping && (
              <div className={`${styles.messageRow} ${styles.rowBot}`}>
                <div className={`${styles.messageBubble} ${styles.bubbleBot}`} style={{ padding: '10px 16px' }}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions Bar */}
          <div className={styles.suggestionsBar}>
            {getSuggestions().map((sug) => (
              <button
                key={sug}
                className={styles.suggestionChip}
                onClick={() => handleSend(sug)}
                disabled={botTyping}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <input 
              type="text" 
              placeholder="Escribe un mensaje para responder al chatbot..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              className={styles.chatInput}
              disabled={botTyping}
            />
            <button 
              className={styles.sendButton}
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || botTyping}
            >
              <Send size={18} />
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Database & State Monitor */}
        <div className={styles.monitorWrapper}>
          
          <div className={`card ${styles.monitorCard}`}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} style={{ color: 'var(--brand-500)' }} />
              <h3 className={styles.cardTitle}>Consola del Desarrollador</h3>
            </div>
            
            <div className="card-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className={styles.monitorExplanation}>
                Esta consola monitorea el **Estado de Memoria de Sesión** que el Bot envía y recibe en cada petición POST. Permite auditar qué datos está extrayendo.
              </p>

              {/* Step info */}
              <div className={styles.monitorItem}>
                <span className={styles.monitorLabel}>Paso de Flujo (Step):</span>
                <span className={styles.monitorBadge}>
                  {chatState.step}
                </span>
              </div>

              {/* Extracted params */}
              <div className={styles.monitorDataGroup}>
                <h4 className={styles.groupTitle}>Parámetros de Reserva Extraídos</h4>
                
                <div className={styles.dataRow}>
                  <span>Fecha Llegada (Check-In):</span>
                  <strong className={chatState.arrival ? styles.dataExtracted : styles.dataEmpty}>
                    {chatState.arrival || '—'}
                  </strong>
                </div>

                <div className={styles.dataRow}>
                  <span>Fecha Salida (Check-Out):</span>
                  <strong className={chatState.departure ? styles.dataExtracted : styles.dataEmpty}>
                    {chatState.departure || '—'}
                  </strong>
                </div>

                <div className={styles.dataRow}>
                  <span>Pasajeros:</span>
                  <strong>
                    {chatState.adults === undefined ? '—' : (
                      <span className={styles.dataExtracted}>
                        {chatState.adults}A, {chatState.children || 0}N, {chatState.pets || 0}M
                      </span>
                    )}
                  </strong>
                </div>

                <div className={styles.dataRow}>
                  <span>Habitación Pre-seleccionada:</span>
                  <strong>
                    {chatState.selectedOptionIndex !== undefined && chatState.availableOptions ? (
                      <span className={styles.dataExtracted}>
                        {chatState.availableOptions[chatState.selectedOptionIndex].unitTypeName} ({chatState.availableOptions[chatState.selectedOptionIndex].roomName})
                      </span>
                    ) : '—'}
                  </strong>
                </div>

                <div className={styles.dataRow}>
                  <span>Datos Pasajero:</span>
                  {chatState.guestInfo ? (
                    <div className={styles.guestJson}>
                      <div>Nombre: {chatState.guestInfo.firstName} {chatState.guestInfo.lastName}</div>
                      <div>RUT: {chatState.guestInfo.rut}</div>
                      <div>Mail: {chatState.guestInfo.email}</div>
                    </div>
                  ) : <strong>—</strong>}
                </div>
              </div>

              {/* Database Live Sync status */}
              <div className={styles.liveDbBox}>
                <div className={styles.pulseDot}></div>
                <div>
                  <span className={styles.liveDbTitle}>Base de Datos SQLite Sincronizada</span>
                  <span className={styles.liveDbDesc}>
                    Cuando confirmas la reserva, el bot interactúa directamente con Prisma ORM e inserta los datos de forma real.
                  </span>
                </div>
              </div>

              <div className={styles.instructionsBox}>
                <h5>¿Cómo probar el simulador?</h5>
                <ol>
                  <li>Escribe *"Hola"* para iniciar.</li>
                  <li>Dile fechas ej: *"del 12 al 15 de junio"* (el bot buscará cabañas libres en esas fechas).</li>
                  <li>Indícale cuántos vienen ej: *"2 adultos y 1 niño"*.</li>
                  <li>Elige el número de cabaña (ej: *1* o *2*).</li>
                  <li>Escribe tu info de cliente separada por comas.</li>
                  <li>Escribe *"CONFIRMAR"* y ve a revisar tu Calendario.</li>
                </ol>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
