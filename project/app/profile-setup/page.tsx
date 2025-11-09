'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { PROFILE_ICONS } from '@/components/profileIcons'

const PREFILL_KEY = 'EW_PROFILE_PREFILL_V1'

export default function ProfileSetup() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    hobbies: [] as string[],
    avatarId: PROFILE_ICONS[0].id,
    location: ''
  })
  const [hobbyInput, setHobbyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const checkProfile = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.push('/login')
        return
      }

      setUser(userData.user)

      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (existing) {
        router.push('/dashboard')
        return
      }

      // Prefill from auth metadata
      const meta = userData.user.user_metadata || {}
      let prefill: any = { ...meta }
      // Fallback to local storage if metadata lost
      if (!meta.name) {
        try {
          const raw = localStorage.getItem(PREFILL_KEY)
          if (raw) prefill = { ...prefill, ...JSON.parse(raw) }
        } catch {}
      }
      setForm(f => ({
        ...f,
        full_name: prefill.name || '',
        bio: prefill.bio || '',
        hobbies: Array.isArray(prefill.hobbies) ? prefill.hobbies : [],
        avatarId: prefill.avatarId || f.avatarId,
        location: prefill.location || ''
      }))
      setLoading(false)
    }

    checkProfile()
  }, [router])

  const handleSubmit = async () => {
    setErrorMsg('')
    if (!form.full_name.trim()) {
      setErrorMsg('Name is required')
      return
    }
    if (!user) return
    setSaving(true)
    // Upsert profile
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: form.full_name,
      email: user.email,
      profile_icon: form.avatarId,
      bio: form.bio || null,
      hobbies: form.hobbies,
      location: form.location || null
    }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      console.error('Error creating profile:', error.message)
      setErrorMsg('Failed to create profile. Please retry.')
      return
    }
    router.push('/dashboard')
  }

  if (loading) return <p className="text-center mt-10">Loading profile setup…</p>

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-lg space-y-4 rounded-lg border p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
        <p className="text-sm text-slate-600 mb-6">Finish setting up your profile.</p>
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
          </div>
          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="grid grid-cols-6 gap-3">
              {PROFILE_ICONS.map((ic: { id: string; src: string; label: string }) => (
                <button key={ic.id} type="button" onClick={() => setForm(f => ({ ...f, avatarId: ic.id }))} className={`rounded-full overflow-hidden hover:ring-2 hover:ring-emerald-500 transition ${form.avatarId === ic.id ? 'ring-2 ring-emerald-600' : ''}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={ic.src} alt={ic.label} />
                    <AvatarFallback>…</AvatarFallback>
                  </Avatar>
                </button>
              ))}
            </div>
          </div>
          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          <Button disabled={saving} onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Saving…' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
