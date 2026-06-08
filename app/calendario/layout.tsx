import { SessionProvider } from 'next-auth/react'
import AppLayout from '@/components/layout/AppLayout'

export default function CalendarioLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Calendario de Reservas">{children}</AppLayout>
}
