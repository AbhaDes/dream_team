"use client"

import { useApp, Role } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Check } from "lucide-react"

const roles: { value: Role; label: string; description: string }[] = [
  { value: "developer", label: "Developer", description: "Build the technical solution" },
  { value: "designer", label: "Designer", description: "Create the user experience" },
  { value: "pm", label: "Product Manager", description: "Lead strategy and coordination" },
  { value: "other", label: "Other", description: "Marketing, data, or other roles" },
]

const availabilityOptions = [
  { value: "full-time" as const, label: "Full-time", description: "Available throughout the event" },
  { value: "part-time" as const, label: "Part-time", description: "A few hours per day" },
  { value: "flexible" as const, label: "Flexible", description: "Varies day by day" },
]

const skillSuggestions = [
  "React", "TypeScript", "Node.js", "Python", "Go", "Rust",
  "Figma", "UI/UX", "Prototyping", "User Research",
  "Machine Learning", "Data Science", "AWS", "DevOps",
  "Product Strategy", "Agile", "Scrum", "Marketing",
]

const experienceLevel = ["Beginner", "Intermediate", "Advanced"]

export default function ProfilePage() {
  const { user, isAuthenticated, updateProfile } = useApp()
  const router = useRouter()
  
  const [username, setName] = useState("")
  const [role, setRole] = useState<Role | undefined>()
  const [skills, setSkills] = useState<string[]>([])
  const [availability, setAvailability] = useState<"full-time" | "part-time" | "flexible">("flexible")
  const [bio, setBio] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [saved, setSaved] = useState(false)
  const [experience, setExperience] = 

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setName(user.username)
      setRole(user.role)
      setSkills(user?.skills ?? [])
      setAvailability(user.availability)
      setBio(user.bio || "")
      setExperience(user.)
    }
  }, [user])

  if (!isAuthenticated || !user) {
    return null
  }

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !skills.includes(trimmed) && skills.length < 10) {
      setSkills([...(skills ?? []), trimmed])
    }
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    setSkills((skills ?? []).filter(s => s !== skill))
  }

  const handleSave = () => {
    //this is all the info expected from the controller in the backend
    //const {role, experience, availability, skills, bio} = req.body;
    //const eventId = req.params.eventId;
    //const userId = req.user.user_id;
    //it's a put request
    const profileComplete = !!role && skills.length > 0
    updateProfile({
      username,
      role,
      skills,
      availability,
      bio,
      profileComplete,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Profile</h1>
          <p className="text-muted-foreground mb-8">
            Tell us about yourself to get better matches
          </p>

          <div className="space-y-8">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-3">Role</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`text-left p-4 rounded-md border transition-colors ${
                      role === r.value
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <p className="font-medium text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Skills <span className="text-muted-foreground font-normal">({skills.length}/10)</span>
              </label>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSkill(skillInput)
                    }
                  }}
                  placeholder="Add a skill"
                  className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <button
                  onClick={() => addSkill(skillInput)}
                  disabled={!skillInput.trim()}
                  className="h-9 px-4 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {skillSuggestions
                  .filter(s => !skills.includes(s))
                  .slice(0, 8)
                  .map((skill) => (
                    <button
                      key={skill}
                      onClick={() => addSkill(skill)}
                      className="px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                    >
                      + {skill}
                    </button>
                  ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium mb-3">Availability</label>
              <div className="space-y-2">
                {availabilityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAvailability(opt.value)}
                    className={`w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between ${
                      availability === opt.value
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {availability === opt.value && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Bio <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell potential teammates about yourself..."
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
              />
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                className="h-10 px-6 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Save profile
              </button>
              {saved && (
                <span className="text-sm text-muted-foreground">Saved!</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
