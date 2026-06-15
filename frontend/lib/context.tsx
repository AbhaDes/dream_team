"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { CURRENT_EVENT_ID } from "@/constants"
const API_URL = process.env.NEXT_PUBLIC_API_URL 

// 'Frontend Developer', 
    // 'Backend Developer',
    // 'Full-stack Developer', 
    // 'UI/UX Designer', 
    // 'Product Manager' 
export type Role = "Frontend Developer" | "Backend Developer" | "Full-stack Developer" | "UI/UX Designer" | "Product Manager";

// 'Full Time (30+ hours)',
    // 'Most of the Time (20-30 hours)',
    // 'Part Time (10-20 hours)',
    // 'Limited (Less than 10 hours)',
    // 'Flexible Schedule'

export interface User {
  id: string
  email: string
  username: string
  role?: Role
  skills: string[]
  availability: "Full Time (30+ hours)" | 
                "Most of the Time (20-30 hours)" | 
                "Part Time (10-20 hours)" | 
                "Limited (Less than 10 hours)" | 
                "Flexible Schedule"
  experience?: "Beginner" | "Intermediate" | "Advanced"
  bio?: string
  eventCode?: string
  profileComplete: boolean
}

export interface Match {
  participant_id: string
  user_id: string
  event_id: string
  role: string
  experience: string
  skills: string[]
  availability: string
  bio: string
  username: string
  compatibility_score: number
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
  signup: (email: string, password: string, username: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: Partial<User>) => void
  fetchMatches: () => void
  acceptMatch: (matchId: string) => void
  declineMatch: (matchId: string) => void
  isLoading: boolean
}

const AppContext = createContext<AppContextType | null>(null)


export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    matches: [],
    connections: [],
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(false);
  }, [])

  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem("dreamteam-state", JSON.stringify(state))
    }
  }, [state])

  const fetchMatches = async() => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches`;

    console.log(url);

      try{
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type' : 'application/json'
          },
          credentials : 'include'
        }) 

        //check if response failed 
        if(!response.ok){
          throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        setState(prev => ({
          ...prev,
          matches: result.matches 
        }))          
      }catch(error){
        console.log("Error: ", error);
      }

  }

  //change this function to call the login request

  const login = async (email: string, password: string): Promise<boolean> => {
    const url = `/api/auth/login`;
    
    try {
      const response = await fetch(url, {
        method: 'POST', // 1. Specify your HTTP method here
        headers: {
          'Content-Type': 'application/json', // 2. Tell server you're sending JSON
        },
        body: JSON.stringify({email, password}), // 3. Convert your data payload to a string
      });
      //check if the response failed
      if(!response.ok){
        throw new Error(`Reponse status: ${response.status}`);
      }

      //parse the response body with response.json()
      const result = await response.json();
      //use setState() to update the app state with real user data
      setState({
        user: result.user,
        matches: [],
        connections: [],
        isAuthenticated: true,
      })

    return true
    }catch(error){
      console.error('Error', error);
      return false;

    }
  }

  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    const url = `/api/auth/register`;

    try{
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type' : 'application/json',
        },
        body: JSON.stringify({email, password, username}),
      });

      //check if response failed 
      if(!response.ok){
        throw new Error(`Response status: ${response.status}`);
      }

      const result = await response.json();
      setState({
        user: result.user,
        matches: [],
        connections: [],
        isAuthenticated: true,

      })
      
      return true;
    }catch(error){
      console.error("Error: ", error);
      return false;

    }
    
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
      return {
        ...prev,
        user: updatedUser,
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
      fetchMatches,
      acceptMatch,
      declineMatch,
      isLoading,
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
