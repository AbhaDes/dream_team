"use client"

import { useApp } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { MessageSquare, Clock, Heart } from "lucide-react"
import { PendingMatch, Connection } from "@/lib/context"

export default function ConnectionsPage() {
  const { user, connections, pendingMatches, isAuthenticated } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push("/login")
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) return null

  const liked: PendingMatch[] = pendingMatches.filter(p => !p.needs_my_response)
  const awaiting: PendingMatch[] = pendingMatches.filter(p => p.needs_my_response)
  const matched: Connection[] = connections

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const PendingCard = ({ p }: { p: PendingMatch }) => (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base font-medium shrink-0">
          {p.other_username.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{p.other_username}</p>
          <p className="text-sm text-muted-foreground capitalize mb-2">{p.other_role}</p>
          {p.other_bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.other_bio}</p>}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {p.other_skills.map(skill => (
              <span key={skill} className="px-2 py-0.5 rounded bg-secondary text-xs">{skill}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground capitalize">{p.other_availability}</p>
        </div>
      </div>
    </div>
  )

  const MatchedCard = ({ c }: { c: Connection }) => (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base font-medium shrink-0">
            {c.other_username.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{c.other_username}</p>
            <p className="text-sm text-muted-foreground capitalize mb-2">{c.other_role}</p>
            {c.other_bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.other_bio}</p>}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {c.other_skills.map(skill => (
                <span key={skill} className="px-2 py-0.5 rounded bg-secondary text-xs">{skill}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="capitalize">{c.other_availability}</span>
              <span>•</span>
              <span>Connected {formatDate(c.matched_at)}</span>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 h-9 px-4 rounded-md border border-border text-sm hover:bg-secondary transition-colors shrink-0">
          <MessageSquare className="w-4 h-4" />
          Message
        </button>
      </div>
    </div>
  )

  const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-10 border border-dashed border-border rounded-md">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )

  const Section = ({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Connections</h1>
          <p className="text-muted-foreground mb-8">Track your matches and pending connections</p>

          <Section title="Connected" count={matched.length} icon={<MessageSquare className="w-4 h-4 text-muted-foreground" />}>
            {matched.length === 0
              ? <EmptyState label="No mutual matches yet." />
              : <div className="space-y-3">{matched.map(c => <MatchedCard key={c.match_id} c={c} />)}</div>}
          </Section>

          <Section title="Awaiting response" count={awaiting.length} icon={<Clock className="w-4 h-4 text-muted-foreground" />}>
            {awaiting.length === 0
              ? <EmptyState label="Nobody is waiting on you right now." />
              : <div className="space-y-3">{awaiting.map(p => <PendingCard key={p.match_id} p={p} />)}</div>}
          </Section>

          <Section title="Liked" count={liked.length} icon={<Heart className="w-4 h-4 text-muted-foreground" />}>
            {liked.length === 0
              ? <EmptyState label="You haven't liked anyone yet." />
              : <div className="space-y-3">{liked.map(p => <PendingCard key={p.match_id} p={p} />)}</div>}
          </Section>
        </div>
      </main>
    </div>
  )
}