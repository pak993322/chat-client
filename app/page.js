"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import Chat from "./chat/page" // import your Chat component
import ProtectedRoute from "./components/ProtectedRoute"
import { useAuth } from "./context/AuthContext"
import io from "socket.io-client"
import { LogOut } from 'lucide-react';
const socket = io("http://localhost:8000")
export default function UserList() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    try {
      const user = localStorage.getItem("user")
      if (user) {
        setCurrentUser(JSON.parse(user))
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    axios
      .get("https://chat-backend-production-b501.up.railway.app/api/users")
      .then((response) => {
        setUsers(response.data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error fetching users:", error)
        setError("Failed to load users. Please try again later.")
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selectedUser === null && currentUser) {
      socket.emit("disconnectsingleuser", currentUser.id)
    }
  }, [selectedUser, currentUser])
  

    useEffect(() => {
    const handleBackToUserList = () => {
      setSelectedUser(null)
    }

    window.addEventListener("backToUserList", handleBackToUserList)

    return () => {
      window.removeEventListener("backToUserList", handleBackToUserList)
    }
  }, [])

  const handleUserClick = async (user) => {
    if (!currentUser) return

    try {
      await axios.post("https://chat-backend-production-b501.up.railway.app/api/userlistwithchat", {
        currentUserId: currentUser.id,
        chats: [
          {
            chatWithId: user._id,
            username: user.username,
          },
        ],
      })
      console.log("Chat saved or updated successfully")
      setSelectedUser(user._id)
    } catch (error) {
      console.error("Error creating chat:", error)
    }
  }

  const handleBackToUsers = () => {
    setSelectedUser(null)
  }

  return (
    <ProtectedRoute>
    <>
      {!selectedUser ? (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-violet-500 rounded-t-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">ChatApp</h1>
                {currentUser && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="font-bold">{currentUser?.username?.charAt(0).toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <div className="flex space-x-2">
                      <div className="font-medium">{currentUser?.username}</div>
                      <div onClick={logout}>
                      <LogOut/>
                      </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main content */}
            <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-purple-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  Available Users
                </h2>
                <p className="text-gray-500 mt-1">Select a user to start chatting</p>
              </div>

              {/* User list */}
              <div className="p-4">
                {loading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="flex space-x-2">
                      <div
                        className="w-3 h-3 rounded-full bg-purple-500 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-3 h-3 rounded-full bg-purple-500 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-3 h-3 rounded-full bg-purple-500 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center p-8 text-red-500">{error}</div>
                ) : users.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mx-auto mb-4 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p>No users available to chat with</p>
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {users.map((user) => (
                      <li key={user._id}>
                        <button
                          onClick={() => handleUserClick(user)}
                          className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-purple-200 bg-white hover:bg-purple-50 transition-all duration-200 shadow-sm hover:shadow-md group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 group-hover:text-purple-700 transition-colors">
                                {currentUser?.username === user.username ? "You" : user.username}
                              </div>
                            </div>
                            <div className="ml-auto">
                              <div className="p-2 rounded-full bg-purple-100 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
                {currentUser ? (
                  <p>
                    You're logged in as <span className="font-medium text-purple-600">{currentUser.username}</span>
                  </p>
                ) : (
                  <p>You need to log in to start chatting</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Chat id={selectedUser} />
      )}
    </>
    </ProtectedRoute>
  )
}

