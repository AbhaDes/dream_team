"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"

export type Role = "developer" | "designer" | "pm" | "other"

export interface User {
  id: string
  email: string
  name: string
  role?: Role
  skills: string[]
  availability: "full-time" | "part-time" | "flexible"
  bio?: string
  eventCode?: string
  profileComplete: boolean
}

export interface Match {
  id: string
  user: User
  compatibility: number
  status: "pending" | "accepted" | "declined"
  matchedAt: string
}

export interface Connection {
  id: string
  user: User
  connectedAt: string
  message?: string
}

interface AppState {
  user: User | null
  matches: Match[]
  connections: Connection[]
  isAuthenticated: boolean
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: Partial<User>) => void
  acceptMatch: (matchId: string) => void
  declineMatch: (matchId: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

const mockUsers: User[] = [
  { id: "2", email: "sarah@example.com", name: "Sarah Chen", role: "designer", skills: ["Figma", "UI/UX", "Prototyping"], availability: "full-time", bio: "Product designer passionate about creating intuitive experiences", profileComplete: true },
  { id: "3", email: "mike@example.com", name: "Mike Johnson", role: "developer", skills: ["Python", "Machine Learning", "Data Science"], availability: "part-time", bio: "ML engineer interested in AI applications", profileComplete: true },
  { id: "4", email: "emma@example.com", name: "Emma Wilson", role: "pm", skills: ["Agile", "Product Strategy", "User Research"], availability: "flexible", bio: "PM with experience shipping 0-to-1 products", profileComplete: true },
  { id: "5", email: "alex@example.com", name: "Alex Rivera", role: "developer", skills: ["React", "Node.js", "GraphQL"], availability: "full-time", bio: "Full-stack developer who loves building web apps", profileComplete: true },
  { id: "6", email: "jordan@example.com", name: "Jordan Lee", role: "designer", skills: ["Brand Design", "Motion", "Illustration"], availability: "part-time", bio: "Creative designer with a focus on brand identity", profileComplete: true },
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    matches: [],
    connections: [],
    isAuthenticated: false,
  })

  useEffect(() => {
    const saved = localStorage.getItem("dreamteam-state")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState(parsed)
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem("dreamteam-state", JSON.stringify(state))
    }
  }, [state])

  const generateMatches = (currentUser: User): Match[] => {
    return mockUsers.map((user, index) => ({
      id: `match-${user.id}`,
      user,
      compatibility: Math.floor(Math.random() * 30) + 70,
      status: "pending" as const,
      matchedAt: new Date(Date.now() - index * 86400000).toISOString(),
    }))
  }

  const login = async (email: string, _password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const user: User = {
      id: "1",
      email,
      name: email.split("@")[0],
      skills: [],
      availability: "flexible",
      profileComplete: false,
    }
    const matches = generateMatches(user)
    setState({
      user,
      matches,
      connections: [],
      isAuthenticated: true,
    })
    return true
  }

  const signup = async (email: string, _password: string, name: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const user: User = {
      id: "1",
      email,
      name,
      skills: [],
      availability: "flexible",
      profileComplete: false,
    }
    setState({
      user,
      matches: [],
      connections: [],
      isAuthenticated: true,
    })
    return true
  }

  const logout = () => {
    localStorage.removeItem("dreamteam-state")
    setState({
      user: null,
      matches: [],
      connections: [],
      isAuthenticated: false,
    })
  }

  const updateProfile = (updates: Partial<User>) => {
    setState(prev => {
      if (!prev.user) return prev
      const updatedUser = { ...prev.user, ...updates }
      const matches = prev.matches.length > 0 ? prev.matches : generateMatches(updatedUser)
      return {
        ...prev,
        user: updatedUser,
        matches,
      }
    })
  }

  const acceptMatch = (matchId: string) => {
    setState(prev => {
      const match = prev.matches.find(m => m.id === matchId)
      if (!match) return prev
      
      const newConnection: Connection = {
        id: `conn-${match.user.id}`,
        user: match.user,
        connectedAt: new Date().toISOString(),
      }
      
      return {
        ...prev,
        matches: prev.matches.map(m => 
          m.id === matchId ? { ...m, status: "accepted" as const } : m
        ),
        connections: [...prev.connections, newConnection],
      }
    })
  }

  const declineMatch = (matchId: string) => {
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => 
        m.id === matchId ? { ...m, status: "declined" as const } : m
      ),
    }))
  }

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      signup,
      logout,
      updateProfile,
      acceptMatch,
      declineMatch,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
