import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function HomePage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  
  if (role === 'superadmin') {
    redirect('/saas')
  } else if (session?.user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}

