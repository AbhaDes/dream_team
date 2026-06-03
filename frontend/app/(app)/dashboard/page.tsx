"use client"

import { useApp } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Hash, Users, UserCheck, Clock } from "lucide-react"

export default function DashboardPage() {
  const { user, matches, connections, isAuthenticated, isLoading, updateProfile } = useApp()
  const router = useRouter()
  const [eventCode, setEventCode] = useState("")
  const [showEventInput, setShowEventInput] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated || !user) {
    return null
  }

  const pendingMatches = matches.filter(m => m.status === "pending").length
  const acceptedMatches = matches.filter(m => m.status === "accepted").length

  const handleJoinEvent = () => {
    if (eventCode.trim()) {
      updateProfile({ eventCode: eventCode.trim().toUpperCase() })
      setShowEventInput(false)
      setEventCode("")
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Welcome back, {user.name}
          </p>

          {!user.profileComplete && (
            <div className="bg-secondary border border-border rounded-md p-4 mb-8">
              <p className="text-sm font-medium mb-1">Complete your profile</p>
              <p className="text-sm text-muted-foreground mb-3">
                Set up your profile to start matching with teammates.
              </p>
              <button
                onClick={() => router.push("/profile")}
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Set up profile
              </button>
            </div>
          )}

          {/* Event Code */}
          <div className="bg-card border border-border rounded-md p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-medium">Event Code</h2>
                <p className="text-sm text-muted-foreground">
                  {user.eventCode ? "You're in an event" : "Join a hackathon"}
                </p>
              </div>
            </div>
            
            {user.eventCode ? (
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono bg-secondary px-3 py-1.5 rounded">
                  {user.eventCode}
                </code>
                <button
                  onClick={() => updateProfile({ eventCode: undefined })}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Leave event
                </button>
              </div>
            ) : showEventInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={8}
                />
                <button
                  onClick={handleJoinEvent}
                  className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Join
                </button>
                <button
                  onClick={() => setShowEventInput(false)}
                  className="h-9 px-4 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowEventInput(true)}
                className="text-sm bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors"
              >
                Enter event code
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-md p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-semibold mb-1">{pendingMatches}</p>
              <p className="text-sm text-muted-foreground">Pending matches</p>
            </div>

            <div className="bg-card border border-border rounded-md p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-semibold mb-1">{acceptedMatches}</p>
              <p className="text-sm text-muted-foreground">Accepted matches</p>
            </div>

            <div className="bg-card border border-border rounded-md p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-semibold mb-1">{connections.length}</p>
              <p className="text-sm text-muted-foreground">Connections</p>
            </div>
          </div>

          {/* Quick Actions */}
          {pendingMatches > 0 && (
            <div className="mt-8">
              <h2 className="font-medium mb-4">Quick actions</h2>
              <button
                onClick={() => router.push("/matches")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Review {pendingMatches} pending {pendingMatches === 1 ? "match" : "matches"} →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
