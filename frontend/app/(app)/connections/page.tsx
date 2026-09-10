"use client"

import { useApp } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { MessageSquare, Clock, Heart, AlertTriangle } from "lucide-react"
import { PendingMatch, Connection } from "@/lib/context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function ConnectionsPage() {
  const { user, connections, pendingMatches, isAuthenticated, fetchPendingMatches, fetchMutualMatches, acceptMatch, deleteMatch, reportMatch } = useApp()
  const router = useRouter()
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportingMatchId, setReportingMatchId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) router.push("/login")
  }, [isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingMatches()
      fetchMutualMatches()
    }
  }, [isAuthenticated])

  const handleLikeBack = async (p: PendingMatch) => {
    await acceptMatch(p.other_participant_id)
  }

  const handleUndoMatch = async (matchId: string) => {
    if (confirm("Are you sure you want to undo this match?")) {
      try {
        await deleteMatch(matchId)
      } catch (error) {
        console.error("Error undoing match:", error)
        alert("Failed to undo match. Please try again.")
      }
    }
  }

  const openReportDialog = (matchId: string) => {
    setReportingMatchId(matchId)
    setReportDialogOpen(true)
  }

  const handleSubmitReport = async () => {
    if (!reportingMatchId || !reportReason.trim()) {
      alert("Please provide a reason for the report")
      return
    }

    setIsSubmittingReport(true)
    try {
      await reportMatch(reportingMatchId, reportReason)
      alert("Report submitted successfully. Thank you for helping keep our community safe.")
      setReportDialogOpen(false)
      setReportReason("")
      setReportingMatchId(null)
    } catch (error) {
      console.error("Error submitting report:", error)
      alert("Failed to submit report. Please try again.")
    } finally {
      setIsSubmittingReport(false)
    }
  }

  if (!isAuthenticated || !user) return null

  const liked: PendingMatch[] = pendingMatches.filter(p => !p.needs_my_response)
  const awaiting: PendingMatch[] = pendingMatches.filter(p => p.needs_my_response)
  const matched: Connection[] = connections

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const PendingCard = ({ p, onLikeBack }: { p: PendingMatch; onLikeBack?: (p: PendingMatch) => void }) => (
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
        <div className="flex gap-2 shrink-0 flex-col">
          {onLikeBack && (
            <button
              onClick={() => onLikeBack(p)}
              className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
            >
              <Heart className="w-4 h-4" />
              Like back
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleUndoMatch(p.match_id)}
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-red-200 text-sm hover:bg-red-50 transition-colors text-red-600"
            >
              Undo
            </button>
            <button
              onClick={() => openReportDialog(p.match_id)}
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-orange-200 text-sm hover:bg-orange-50 transition-colors text-orange-600"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const MatchedCard = ({ c }: { c: Connection }) => (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 flex-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base font-medium shrink-0">
            {c.other_username.charAt(0)}
          </div>
          <div className="flex-1">
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
        <div className="flex gap-2 shrink-0 flex-col">
          <button className="flex items-center gap-2 h-9 px-4 rounded-md border border-border text-sm hover:bg-secondary transition-colors">
            <MessageSquare className="w-4 h-4" />
            Message
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleUndoMatch(c.match_id)}
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-red-200 text-sm hover:bg-red-50 transition-colors text-red-600"
            >
              Undo
            </button>
            <button
              onClick={() => openReportDialog(c.match_id)}
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-orange-200 text-sm hover:bg-orange-50 transition-colors text-orange-600"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>
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
              : <div className="space-y-3">{awaiting.map(p => <PendingCard key={p.match_id} p={p} onLikeBack={handleLikeBack} />)}</div>}
          </Section>

          <Section title="Liked" count={liked.length} icon={<Heart className="w-4 h-4 text-muted-foreground" />}>
            {liked.length === 0
              ? <EmptyState label="You haven't liked anyone yet." />
              : <div className="space-y-3">{liked.map(p => <PendingCard key={p.match_id} p={p} />)}</div>}
          </Section>
        </div>
      </main>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Report Profile</DialogTitle>
            <DialogDescription>
              Please let us know why you're reporting this user. We take these reports seriously.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for report
              </label>
              <Textarea
                id="reason"
                placeholder="Please describe the issue..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReportDialogOpen(false)
                setReportReason("")
              }}
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmittingReport || !reportReason.trim()}
            >
              {isSubmittingReport ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}