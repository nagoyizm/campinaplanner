import { redirect } from 'next/navigation'

export default function DemoIndexPage() {
  // La demo es un solo flujo continuo: empieza siempre en la parte pública
  redirect('/demo/agendio')
}
