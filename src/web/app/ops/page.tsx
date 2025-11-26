import { redirect } from 'next/navigation'
import { getServerUserContext } from '@/lib/auth/server-auth'

export const dynamic = 'force-dynamic'

export default async function OpsLegacyIndex() {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  redirect('/ops/load')
}

