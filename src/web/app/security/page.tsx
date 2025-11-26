import { redirect } from 'next/navigation'
import { getServerUserContext } from '@/lib/auth/server-auth'

export const dynamic = 'force-dynamic'

export default async function SecurityLegacyIndex() {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  redirect('/security/gate')
}

