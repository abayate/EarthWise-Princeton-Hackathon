'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Check session on load
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
      }
    }
    checkSession()
  }, [])

  const handleLoginOrSignup = async () => {
    if (user) {
      // ✅ Already logged in
      router.push('/dashboard')
      return
    }

    if (!email.trim()) {
      setMessage('Please enter your email.')
      return
    }

    setLoading(true)
    setMessage('')

    // ✅ This call handles BOTH login and signup
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    setLoading(false)

    if (error) {
      console.error('Error sending email:', error.message)
      setMessage('Something went wrong. Please try again.')
    } else {
      setMessage('Check your email to log in or sign up.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setMessage('Logged out successfully.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-96 space-y-4 rounded-lg border p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <p className="text-sm text-slate-600 mb-6">
          {user
            ? 'You’re already signed in.'
            : 'Enter your email to sign up or log in.'}
        </p>

        {/* Email input (hidden if logged in) */}
        {!user && (
          <div className="text-left space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        )}

        {/* Button */}
        <Button
          onClick={handleLoginOrSignup}
          className="w-full mt-4"
          disabled={loading}
        >
          {user
            ? 'Go to Dashboard'
            : loading
            ? 'Sending...'
            : 'Sign Up or Log In'}
        </Button>

        {/* Logout button if already signed in */}
        {user && (
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full mt-2"
          >
            Logout
          </Button>
        )}

        {/* Message */}
        {message && (
          <p className="text-sm text-green-600 mt-3">{message}</p>
        )}
      </div>
    </div>
  )
}
