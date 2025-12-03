'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

/**
 * LMS Developer Test Login Page
 *
 * Direct password login bypassing SSO for testing purposes.
 * URL: /auth/dev-login
 * Password: Test123!
 */

type AccountCategory = 'test' | 'head' | 'lt' | 'it' | 'kcfs' | 'office' | 'admin'

interface Account {
  email: string
  label: string
  type: 'LT' | 'IT' | 'KCFS' | 'Office' | 'Admin'
  grade?: string
  role: 'head' | 'teacher' | 'office_member' | 'admin'
  category: AccountCategory
}

// Sample accounts for quick testing
const TEST_ACCOUNTS: Account[] = [
  // Test accounts
  { email: 'kcislkg1lt@kcislk.ntpc.edu.tw', label: 'Test G1 LT', type: 'LT', grade: '1', role: 'teacher', category: 'test' },
  { email: 'kcislkg12it@kcislk.ntpc.edu.tw', label: 'Test G1-2 IT', type: 'IT', grade: '1-2', role: 'teacher', category: 'test' },
  { email: 'kcislkkcfs@kcislk.ntpc.edu.tw', label: 'Test KCFS', type: 'KCFS', grade: '1-6', role: 'teacher', category: 'test' },

  // Admin
  { email: 'tsehungchen@kcislk.ntpc.edu.tw', label: 'Admin', type: 'Admin', role: 'admin', category: 'admin' },

  // Head Teachers
  { email: 'kassieshih@kcislk.ntpc.edu.tw', label: 'Kassie Shih', type: 'LT', grade: '1', role: 'head', category: 'head' },
  { email: 'jonathanperry@kcislk.ntpc.edu.tw', label: 'Jonathan Perry', type: 'IT', grade: '1-2', role: 'head', category: 'head' },

  // Teachers
  { email: 'lizalin@kcislk.ntpc.edu.tw', label: 'Liza Lin', type: 'LT', role: 'teacher', category: 'lt' },
  { email: 'samthompson@kcislk.ntpc.edu.tw', label: 'Sam Thompson', type: 'IT', role: 'teacher', category: 'it' },
  { email: 'carolegodfrey@kcislk.ntpc.edu.tw', label: 'Carole Godfrey', type: 'KCFS', grade: '1-6', role: 'head', category: 'kcfs' },
]

const CATEGORY_LABELS: Record<AccountCategory, string> = {
  test: 'Test',
  admin: 'Admin',
  head: 'Head',
  lt: 'LT',
  it: 'IT',
  kcfs: 'KCFS',
  office: 'Office',
}

export default function DevLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('Test123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data.session) {
        // Login successful, redirect to dashboard
        router.push('/teachers')
        router.refresh()
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (accountEmail: string) => {
    setEmail(accountEmail)
    setPassword('Test123!')
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'LT': return 'bg-green-600'
      case 'IT': return 'bg-blue-600'
      case 'KCFS': return 'bg-purple-600'
      case 'Office': return 'bg-slate-600'
      case 'Admin': return 'bg-red-600'
      default: return 'bg-slate-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800/80 border border-slate-700 rounded-2xl shadow-2xl p-8 backdrop-blur">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">LMS Dev Login</h1>
          <p className="text-slate-400 text-sm mt-1">Direct password login for testing</p>
        </div>

        {/* Quick Select */}
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-3">Quick Select Account:</p>
          <div className="grid grid-cols-3 gap-2">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => handleQuickLogin(account.email)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  email === account.email
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="font-medium text-sm truncate">{account.label}</div>
                <div className="flex gap-1 mt-1">
                  <span className={`px-1.5 py-0.5 text-xs rounded text-white ${getTypeColor(account.type)}`}>
                    {account.type}
                  </span>
                  {account.grade && (
                    <span className="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                      G{account.grade}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Select account above or enter email"
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Test123!"
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Logging in...' : 'Login to LMS'}
          </button>
        </form>

        {/* Warning */}
        <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400 text-center">
            This page is for development testing only. Password: Test123!
          </p>
        </div>
      </div>
    </div>
  )
}
