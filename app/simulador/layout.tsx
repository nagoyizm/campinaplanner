import AppLayout from '@/components/layout/AppLayout'
import { requireSuperAdmin } from '@/lib/org'

export default async function SimuladorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSuperAdmin()
  return <AppLayout title="Simulador de Chatbot">{children}</AppLayout>
}
