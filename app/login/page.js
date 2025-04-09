"use client"

import { useState } from "react"
import { loginUser } from "../../lib/auth"
import { useAuth } from "../context/AuthContext"
import Link from "next/link"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await loginUser(username, password)
      // Use the login function from AuthContext instead of manually setting localStorage
      login(response.user, response.token)
    } catch (err) {
      setError("Invalid username or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white p-6 text-center">
            <h1 className="text-2xl font-bold">Sign In</h1>
          </div>

          {/* Form */}
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-700">
                    Remember me
                  </label>
                </div>
                <a href="#" className="text-purple-600 hover:text-purple-500">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full hover:from-purple-600 hover:to-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md flex items-center justify-center"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : null}
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-purple-600 hover:text-purple-500 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} ChatApp. All rights reserved.
        </div>
      </div>
    </div>
  )
}
