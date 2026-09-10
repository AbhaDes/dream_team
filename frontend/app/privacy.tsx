"use client"

import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Dream-Team
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold tracking-tight mb-8">Privacy Policy</h1>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Data Collection</h2>
              <p className="text-muted-foreground">
                Dream-Team collects the following information from users:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Email address</li>
                <li>Name</li>
                <li>Skills</li>
                <li>Bio</li>
                <li>Role preferences</li>
                <li>Availability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">How We Use Your Data</h2>
              <p className="text-muted-foreground">
                Your data is used to match you with potential team members based on compatibility.
                We do not sell or share your data with third parties, except:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Your email is shared with users you match with</li>
                <li>Your profile information is visible to other users on the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Deletion</h2>
              <p className="text-muted-foreground">
                To request deletion of your data, please email us at{" "}
                <a href="mailto:abhadeshpande5@gmail.com" className="text-foreground hover:underline font-medium">
                  abhadeshpande5@gmail.com
                </a>
                {" "}with your account email address. We will delete your profile and personal information within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any privacy concerns or questions, please contact us at{" "}
                <a href="mailto:abhadeshpande5@gmail.com" className="text-foreground hover:underline font-medium">
                  abhadeshpande5@gmail.com
                </a>
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-border">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
