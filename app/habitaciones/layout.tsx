import AppLayout from '@/components/layout/AppLayout'

export default function HabitacionesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppLayout title="Estado de Habitaciones">{children}</AppLayout>
}
