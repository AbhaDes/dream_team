import Link from "next/link"
import { ArrowRight, Users, Zap, Target } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Dream-Team
          </Link>
          <nav className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/signup" 
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6">
        <section className="py-24 md:py-32">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance max-w-2xl">
            Find your perfect hackathon team
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Match with developers, designers, and makers based on skills, 
            availability, and shared interests. Build something great together.
          </p>
          <div className="mt-10 flex gap-4">
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              I have an account
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-border">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-medium mb-2">Smart Matching</h3>
              <p className="text-sm text-muted-foreground">
                Our algorithm matches you with teammates who complement your skills 
                and share your availability.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-medium mb-2">Event Codes</h3>
              <p className="text-sm text-muted-foreground">
                Join specific hackathons with event codes. Get matched only with 
                participants in your event.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-medium mb-2">Build Connections</h3>
              <p className="text-sm text-muted-foreground">
                Accept matches to connect with potential teammates. Start a 
                conversation and form your dream team.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 border-t border-border">
          <h2 className="text-2xl font-semibold tracking-tight mb-10">How it works</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Create your profile</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us your role, skills, and when you&apos;re available to hack.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium">
                2
              </div>
              <div>
                <h3 className="font-medium mb-1">Join an event</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your hackathon&apos;s event code to match with other participants.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium">
                3
              </div>
              <div>
                <h3 className="font-medium mb-1">Review matches</h3>
                <p className="text-sm text-muted-foreground">
                  Browse your matches and accept the ones that look like a good fit.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium">
                4
              </div>
              <div>
                <h3 className="font-medium mb-1">Form your team</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with your matches and start building something amazing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              Ready to find your team?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of hackers who&apos;ve found their perfect teammates.
            </p>
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Create your profile
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              © 2024 Dream-Team
            </span>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
