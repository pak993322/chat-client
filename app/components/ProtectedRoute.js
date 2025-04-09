"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Show loading state or nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  // If there's no user and we're not loading, don't render children
  if (!user && !loading) {
    return null
  }

  // If there's a user, render the children
  return children
}
