"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Create the auth context
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkUserLoggedIn = () => {
      try {
        const token = localStorage.getItem("token")
        const userData = localStorage.getItem("user")

        if (token && userData) {
          setUser(JSON.parse(userData))
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUserLoggedIn()
  }, [])

  // Login function
  const login = (userData, token) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
    router.push("/")
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
