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
  matches: Match[] //used for fetching top 10 matches
  pendingMatches: PendingMatch[] //used for fetching pending matches
  connections: Connection[] //used for people you have already matched with
  isAuthenticated: boolean
}

//result of login / signup / verifyEmail / resendCode
export interface AuthResult {
  ok: boolean
  error?: string
  needsVerification?: boolean //login: right password, email not verified yet
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (email: string, password: string, username: string) => Promise<AuthResult>
  verifyEmail: (email: string, code: string, password: string) => Promise<AuthResult>
  resendCode: (email: string) => Promise<AuthResult>
  logout: () => void
  updateProfile: (updates: Partial<User>) => void
  fetchMatches: () => void
  fetchPendingMatches: () => void
  fetchMutualMatches: () => void
  acceptMatch: (participantId: string) => Promise<string | null>
  deleteMatch: (matchId: string) => Promise<void>
  reportMatch: (matchId: string, reason: string) => Promise<void>
  authFetch: (url: string, init?: RequestInit) => Promise<Response>

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
    let authenticated = false
    try {
      const saved = localStorage.getItem("dreamteam-state")
      if (saved) {
        const parsed = JSON.parse(saved)
        //merge over the defaults so a stale saved shape (older app version) can't
        //leave a list undefined
        setState(prev => ({
          ...prev,
          ...parsed,
          matches: Array.isArray(parsed.matches) ? parsed.matches : [],
          pendingMatches: Array.isArray(parsed.pendingMatches) ? parsed.pendingMatches : [],
          connections: Array.isArray(parsed.connections) ? parsed.connections : [],
        }))
        authenticated = !!parsed.isAuthenticated
      }
    } catch {
      // ignore
    }
    //if the saved state says logged in, stay loading until /api/auth/me answers
    //(below) so pages don't render stale data and then bounce on a 401
    if (!authenticated) {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem("dreamteam-state", JSON.stringify(state))
    }
  }, [state])

  //The session cookie expires after an hour idle, but the saved state above still
  //says "logged in". Drop it so the pages redirect to /login instead of silently
  //showing empty lists.
  const clearSession = () => {
    localStorage.removeItem("dreamteam-state")
    setState({
      user: null,
      matches: [],
      pendingMatches: [],
      connections: [],
      isAuthenticated: false,
    })
  }

  //fetch for logged-in endpoints: sends the cookie and logs out locally on a 401
  const authFetch = async (url: string, init: RequestInit = {}) => {
    //init.headers may be a plain object, an array of pairs or a Headers object
    const headers = new Headers(init.headers)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })
    if (response.status === 401) {
      clearSession()
    }
    return response
  }

  //on load, check the saved session is still alive on the server
  //(isLoading stays true until this resolves when the saved state says authenticated)
  const [sessionChecked, setSessionChecked] = useState(false)
  useEffect(() => {
    if (state.isAuthenticated && !sessionChecked) {
      //the timeout keeps a stalled request from leaving isLoading true forever;
      //an abort rejects, which takes the same path as any failed request below
      authFetch('/api/auth/me', { signal: AbortSignal.timeout(8000) })
        .catch(() => {})
        .finally(() => {
          setSessionChecked(true)
          setIsLoading(false)
        })
    }
  }, [state.isAuthenticated, sessionChecked])
  
  //GETS THE TOP 10 MATCHES ON THE MATCHES PAGE
  const fetchMatches = async() => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches`;

    console.log(url);

      try{
        const response = await authFetch(url, {
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
  //split by needs my response. 
  const fetchPendingMatches = async() => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches/pending`;
    console.log(url);

    try{
      const response = await authFetch(url, {
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

  const fetchMutualMatches = async() => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches/mutual`;
    console.log(url) //just checking for the intial stage 

    try{
      const response = await authFetch(url, {
        method: 'GET', 
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' //need this for session cookie purposes REMEMBER!!

      })
      //check if the response failed 
      if(!response.ok){
        throw new Error(`Response status: ${response.status}`);
      }
      const result = await response.json();
      setState(prev => ({
        ...prev,
        connections: result.mutual
      }))
      
    }catch(error){
      console.log("Error: ", error);

    }
  }

  //After the server has started a session (login or email verification):
  //store the user, then merge in their event profile
  const finishLogin = async (user: User) => {
    const getProfileUrl = `/api/events/${CURRENT_EVENT_ID}/participants/me`;
    setState({
      user,
      matches: [],
      pendingMatches: [],
      connections: [],
      isAuthenticated: true,
    })

    const profileResponse = await fetch(getProfileUrl, {
      method: 'GET',
      headers: {
        'Content-Type' : 'application/json'
      },
      credentials: "include"
    });

    if(profileResponse.ok){
      const profileResult = await profileResponse.json();
      //merge profile into user state
      setState(prev => ({
        ...prev,
        user: {
         ...prev.user,
          ...profileResult.profile,
          profileComplete: !!profileResult.profile.role
        }
      }))
    }
  }

  //FOR LOGIN PURPOSES ONLY
  //needsVerification = right password, but the email isn't verified yet
  const login = async (email: string, password: string): Promise<AuthResult> => {
    const url = `/api/auth/login`;

    try {
      const response = await fetch(url, {
        method: 'POST', // 1. Specify your HTTP method here
        headers: {
          'Content-Type': 'application/json', // 2. Tell server you're sending JSON
        },
        credentials: "include", //tells the browser to include cookies in the request
        body: JSON.stringify({email, password}), // 3. Convert your data payload to a string
      });
      //parse the response body with response.json()
      const result = await response.json().catch(() => ({}));
      //check if the response failed
      if(!response.ok){
        return {
          ok: false,
          error: result.error || `Login failed (status ${response.status})`,
          needsVerification: !!result.needs_verification,
        };
      }
      //use setState() to update the app state with real user data
      await finishLogin(result.user);
      return { ok: true }
    }catch(error){
      console.error('Error', error);
      return { ok: false, error: 'Something went wrong. Please try again.' };

    }
  }

  //FOR SIGNUP PURPOSES ONLY
  //Creates the account and emails a code -- the user is NOT logged in until verifyEmail
  const signup = async (email: string, password: string, username: string): Promise<AuthResult> => {
    const url = `/api/auth/register`;

    try{
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type' : 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({email, password, username}),
      });

      const result = await response.json().catch(() => ({}));
      //check if response failed
      if(!response.ok){
        return { ok: false, error: result.error || `Could not create account (status ${response.status})` };
      }
      return { ok: true, needsVerification: true };
    }catch(error){
      console.error("Error: ", error);
      return { ok: false, error: 'Something went wrong. Please try again.' };

    }

  }

  //FOR EMAIL VERIFICATION ONLY -- a correct code + the account's password logs the user in.
  //The password is only sent, never stored here or in localStorage.
  const verifyEmail = async (email: string, code: string, password: string): Promise<AuthResult> => {
    try{
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type' : 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({email, code, password}),
      });

      const result = await response.json().catch(() => ({}));
      if(!response.ok){
        return { ok: false, error: result.error || `Could not verify (status ${response.status})` };
      }
      await finishLogin(result.user);
      return { ok: true };
    }catch(error){
      console.error("Error: ", error);
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }

  //asks for a new verification code (the server answers the same whether or not one is sent)
  const resendCode = async (email: string): Promise<AuthResult> => {
    try{
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type' : 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({email}),
      });

      const result = await response.json().catch(() => ({}));
      if(!response.ok){
        return { ok: false, error: result.error || `Could not send a new code (status ${response.status})` };
      }
      return { ok: true };
    }catch(error){
      console.error("Error: ", error);
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }

  const logout = async() => {

    //call the backend here 
    const url = '/api/auth/logout'
    try{

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type' : 'application/json',
        },
        credentials: "include" //tells the browser to include cookies in the request
      })

      //check if response failed (a 401 just means the session already expired)
      if(!response.ok && response.status !== 401){
        throw new Error(`Response status: ${response.status}`);
      }

    }catch(error){
      console.error('Error', error);
    }
    //log out locally either way, so a dead session can't leave the user stuck "logged in"
    clearSession();
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
  
  //FOR LIKING MATCH PURPOSES ONLY
  const acceptMatch = async (participantId: string): Promise<string | null> => {
    const url = `/api/events/${CURRENT_EVENT_ID}/like`

    try{
      const response = await authFetch(url, {
        method: 'POST',
        body : JSON.stringify({
          participant_id : participantId
        }),
      })
      if(!response.ok){
        //e.g. 409 "team is already full" -- the user needs to see why nothing happened
        const result = await response.json().catch(() => ({}))
        return result.error || `Could not like this teammate (status ${response.status})`
      }

      //remove the liked person from the matches list right away
      setState(prev => ({
        ...prev,
        matches: prev.matches.filter(m => m.participant_id !== participantId)
      }))

      //refresh pending + mutual so the connections page sections are current
      //(a like can create a pending match or complete a mutual one)
      await Promise.all([fetchPendingMatches(), fetchMutualMatches()])
      return null

    }catch(error){
      console.log('Error: ', error);
      return "Could not reach the server. Please try again."
    }
  }

  // DELETE A MATCH (UNDO)
  const deleteMatch = async (matchId: string) => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches/${matchId}`

    try {
      const response = await authFetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Response Status: ${response.status}`);
      }

      // Refresh both lists to reflect the deletion
      await Promise.all([fetchPendingMatches(), fetchMutualMatches()])
    } catch (error) {
      console.log('Error deleting match:', error);
      throw error;
    }
  }

  // REPORT A MATCH
  const reportMatch = async (matchId: string, reason: string) => {
    const url = `/api/events/${CURRENT_EVENT_ID}/matches/${matchId}/report`

    try {
      const response = await authFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Response Status: ${response.status}`);
      }
    } catch (error) {
      console.log('Error reporting match:', error);
      throw error;
    }
  }
  
  return (
    <AppContext.Provider value={{
      ...state,
      login,
      signup,
      verifyEmail,
      resendCode,
      logout,
      updateProfile,
      fetchMatches,
      fetchPendingMatches,
      acceptMatch,
      deleteMatch,
      reportMatch,
      fetchMutualMatches,
      authFetch,
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
