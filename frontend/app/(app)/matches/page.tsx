"use client"

import { useApp, Match} from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Check, X } from "lucide-react"



export default function MatchesPage() {
  const { user, matches, isAuthenticated, fetchMatches, acceptMatch, declineMatch } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    fetchMatches();
  },[])

  if (!isAuthenticated || !user) {
    return null
  }

  const pendingMatches = matches //here, matches endpoint getPendingMatches can be call
  const mutualMatches = [] as Match[]//here, match controller endpoint getMutualMatches can be called



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
                    key={match.participant_id}
                    className="bg-card border border-border rounded-md p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                            {match.username.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{match.username}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {match.role || "No role set"}
                            </p>
                          </div>
                        </div>
                        
                        {match.bio && (
                          <p className="text-sm text-muted-foreground mb-3 ml-13">
                            {match.bio}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 ml-13">
                          {match.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded bg-secondary text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 mt-4 ml-13 text-xs text-muted-foreground">
                          <span className="capitalize">{match.availability}</span>
                          <span>•</span>
                          <span>{match.compatibility_score}% match</span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => declineMatch(match.participant_id)}
                          className="w-9 h-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => acceptMatch(match.participant_id)}
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

          {/* Mutual Matches */}
          {mutualMatches.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                Decided ({mutualMatches.length})
              </h2>
              
              <div className="space-y-2">
                {mutualMatches.map((match) => (
                  <div
                    key={match.user_id}
                    className="border border-border rounded-md p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {match.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{match.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {match.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-[#22c55e]/10 text-[#22c55e]">
                      Connected
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
