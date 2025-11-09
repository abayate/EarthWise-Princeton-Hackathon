'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProfileSetup() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkProfile = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.push('/login')
        return
      }

      setUser(userData.user)

      // Check if profile exists
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (existing) {
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    }

    checkProfile()
  }, [router])

  const handleSubmit = async () => {
    if (!name.trim()) return

    const { error } = await supabase
      .from('profiles')
      .insert([{ id: user.id, name, prefs: {}, points: 0, streak: 0 }])

    if (error) {
      console.error('Error creating profile:', error.message)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) return <p className="text-center mt-10">Loading...</p>

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-96 space-y-4 rounded-lg border p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
        <p className="text-sm text-slate-600 mb-6">
          Let’s set up your profile.
        </p>
        <div className="text-left space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
          />
        </div>
        <Button className="w-full mt-4" onClick={handleSubmit}>
          Continue
        </Button>
      </div>
    </div>
  )
}
