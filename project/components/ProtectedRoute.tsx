'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        // If not authenticated, send to login
        router.push('/login')
        return
      }
      // Skip profile check if already on onboarding or profile-setup
      if (pathname === '/onboarding' || pathname === '/profile-setup') {
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      const incomplete = !profile ||
        !((profile.full_name && String(profile.full_name).trim().length > 0) || (profile.bio && String(profile.bio).trim().length > 0)) ||
        (Array.isArray((profile as any)?.hobbies) ? (profile as any).hobbies.length === 0 : true) ||
        (typeof (profile as any)?.overall_contentment === 'number' ? (profile as any).overall_contentment <= 0 : true) ||
        (typeof (profile as any)?.eco_friendly_score === 'number' ? (profile as any).eco_friendly_score <= 0 : true)
      if (incomplete) {
        router.push('/onboarding')
        return
      }
      setLoading(false)
    }
    checkUser()
  }, [router, pathname])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-600">Loading…</div>
  }
  return <>{children}</>
}
