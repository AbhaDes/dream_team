"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/context"

//matches the server's 60s resend cooldown
const RESEND_COOLDOWN_SECONDS = 60

//The "enter the 6-digit code we emailed you" step, shared by signup and login.
//A correct code logs the user in; onVerified then decides where to go.
export function VerifyCodeStep({
  email,
  password,
  onVerified,
  onBack,
  sendOnMount = false,
}: {
  email: string
  //the password the user just typed on the signup/login form -- the server checks it
  //along with the code. Held in the parent's component state only, never persisted.
  password: string
  onVerified: () => void
  onBack: () => void
  //login lands here without a fresh code, so ask for one straight away
  sendOnMount?: boolean
}) {
  const { verifyEmail, resendCode } = useApp()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  //signup just sent a code, so start in the cooldown
  const [cooldown, setCooldown] = useState(sendOnMount ? 0 : RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    setError("")
    setNotice("")
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const result = await resendCode(email)
    if (result.ok) {
      setNotice("If your account still needs verifying, a new code is on its way.")
    } else {
      setError(result.error || "Could not send a new code")
    }
  }

  //runs once when the step opens
  useEffect(() => {
    if (sendOnMount) handleResend()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)
    try {
      const result = await verifyEmail(email, code, password)
      if (result.ok) {
        onVerified()
      } else {
        setError(
          result.error === "Invalid or expired code"
            ? "That code is wrong or has expired (or the password doesn't match this signup). Codes last 10 minutes and stop working after 5 wrong tries — request a new one if needed."
            : result.error || "Could not verify your email"
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        Check your email
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
        Enter it below to verify your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            Verification code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground tracking-[0.5em] text-center placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="123456"
            required
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {notice && (
          <p className="text-sm text-muted-foreground">{notice}</p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="hover:text-foreground hover:underline"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-foreground hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  )
}
