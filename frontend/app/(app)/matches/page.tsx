"use client"

import { useApp } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Check, X } from "lucide-react"

export default function MatchesPage() {
  const { user, matches, isAuthenticated, acceptMatch, declineMatch } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return null
  }

  const pendingMatches = matches.filter(m => m.status === "pending")
  const decidedMatches = matches.filter(m => m.status !== "pending")

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Matches</h1>
          <p className="text-muted-foreground mb-8">
            Review potential teammates and build your team
          </p>

          {!user.profileComplete && (
            <div className="bg-secondary border border-border rounded-md p-4 mb-8">
              <p className="text-sm text-muted-foreground">
                Complete your profile to get personalized matches.{" "}
                <button
                  onClick={() => router.push("/profile")}
                  className="text-foreground hover:underline"
                >
                  Set up profile →
                </button>
              </p>
            </div>
          )}

          {/* Pending Matches */}
          <section className="mb-10">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Pending ({pendingMatches.length})
            </h2>
            
            {pendingMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center border border-border border-dashed rounded-md">
                No pending matches
              </p>
            ) : (
              <div className="space-y-3">
                {pendingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-card border border-border rounded-md p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                            {match.user.username.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{match.user.username}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {match.user.role || "No role set"}
                            </p>
                          </div>
                        </div>
                        
                        {match.user.bio && (
                          <p className="text-sm text-muted-foreground mb-3 ml-13">
                            {match.user.bio}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 ml-13">
                          {match.user.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded bg-secondary text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 mt-4 ml-13 text-xs text-muted-foreground">
                          <span className="capitalize">{match.user.availability}</span>
                          <span>•</span>
                          <span>{match.compatibility}% match</span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => declineMatch(match.id)}
                          className="w-9 h-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => acceptMatch(match.id)}
                          className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Decided Matches */}
          {decidedMatches.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                Decided ({decidedMatches.length})
              </h2>
              
              <div className="space-y-2">
                {decidedMatches.map((match) => (
                  <div
                    key={match.id}
                    className="border border-border rounded-md p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {match.user.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{match.user.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {match.user.role}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        match.status === "accepted"
                          ? "bg-[#22c55e]/10 text-[#22c55e]"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {match.status === "accepted" ? "Connected" : "Declined"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
