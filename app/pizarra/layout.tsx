import AppLayout from '@/components/layout/AppLayout'

export default function PizarraLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Pizarra / Memo">{children}</AppLayout>
}
