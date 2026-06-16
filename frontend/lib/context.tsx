"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { CURRENT_EVENT_ID } from "@/constants"
const API_URL = process.env.NEXT_PUBLIC_API_URL 

export type Role = "Frontend Developer" | "Backend Developer" | "Full-stack Developer" | "UI/UX Designer" | "Product Manager";

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
  match_id: string
  other_username: string
  other_role: string
  other_skills: string[]
  other_experience: string
  other_availability: string
  other_bio: string
  matched_at: string
}

export interface PendingMatch{
  match_id: string
  user1_id: string
  user2_id: string
  user1_status: string
  user2_status: string
  other_username: string
  other_user_id: string
  other_role: string
  other_experience: string
  other_participant_id: string
  other_availability: string
  other_skills: string[]
  other_bio: string
  needs_my_response: boolean
  created_at: string

}

interface AppState {
  user: User | null
  matches: Match[]
  pendingMatches: PendingMatch[]
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
  isLoading: boolean
}

const AppContext = createContext<AppContextType | null>(null)


export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    matches: [],
    pendingMatches: [],
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

  //PENDING MATCHES 
  //router.get('/:eventId/matches/mutual', authMiddleware, matchController.getMutualMatches);
  const fetchPendingMatches = async() => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches/pending`;
    console.log(url);

    try{
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'

      })
      //check if the response failed 
      if(!response.ok){
        throw new Error(`Response status: ${response.status}`);
      }
      const result = await response.json();
      setState(prev => ({
        ...prev, 
        pendingMatches: result.pending
      }))
    }catch(error){
      console.log('Error: ', error);

    }
  }

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
        pendingMatches: [],
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
        pendingMatches: [],
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
      pendingMatches: [],
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
  
  //change acceptMatch to call on the backend
  const acceptMatch = (matchId: string) => {
    setState(prev => {
      const match = prev.matches.find(m => m.user_id === matchId)
      if (!match) return prev
      
      return {
        ...prev,
        matches: prev.matches.map(m => 
          m.user_id === matchId ? { ...m, status: "accepted" as const } : m
        ),
        connections: [...prev.connections],
      }
    })
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
