import AppLayout from '@/components/layout/AppLayout'

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppLayout title="Inventario">{children}</AppLayout>
}
