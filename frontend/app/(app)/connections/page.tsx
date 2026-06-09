"use client"

import { useApp } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { MessageSquare } from "lucide-react"

export default function ConnectionsPage() {
  const { user, connections, isAuthenticated } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Connections</h1>
          <p className="text-muted-foreground mb-8">
            People you&apos;ve connected with
          </p>

          {connections.length === 0 ? (
            <div className="text-center py-16 border border-border border-dashed rounded-md">
              <p className="text-muted-foreground mb-2">No connections yet</p>
              <p className="text-sm text-muted-foreground">
                Accept matches to start building your team.{" "}
                <button
                  onClick={() => router.push("/matches")}
                  className="text-foreground hover:underline"
                >
                  View matches →
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-card border border-border rounded-md p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-medium">
                        {connection.user.username.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{connection.user.username}</p>
                        <p className="text-sm text-muted-foreground capitalize mb-2">
                          {connection.user.role}
                        </p>
                        
                        {connection.user.bio && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {connection.user.bio}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {connection.user.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded bg-secondary text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="capitalize">{connection.user.availability}</span>
                          <span>•</span>
                          <span>Connected {formatDate(connection.connectedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="flex items-center gap-2 h-9 px-4 rounded-md border border-border text-sm hover:bg-secondary transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {connections.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                Team summary
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-md p-4">
                  <p className="text-2xl font-semibold mb-1">{connections.length}</p>
                  <p className="text-xs text-muted-foreground">Total members</p>
                </div>
                <div className="bg-card border border-border rounded-md p-4">
                  <p className="text-2xl font-semibold mb-1">
                    {connections.filter(c => c.user.role === "developer").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Developers</p>
                </div>
                <div className="bg-card border border-border rounded-md p-4">
                  <p className="text-2xl font-semibold mb-1">
                    {connections.filter(c => c.user.role === "designer").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Designers</p>
                </div>
                <div className="bg-card border border-border rounded-md p-4">
                  <p className="text-2xl font-semibold mb-1">
                    {connections.filter(c => c.user.role === "pm").length}
                  </p>
                  <p className="text-xs text-muted-foreground">PMs</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
