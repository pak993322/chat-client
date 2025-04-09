"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import Chat from "./chat/page" // import your Chat component
import ProtectedRoute from "./components/ProtectedRoute"
import { useAuth } from "./context/AuthContext"
import io from "socket.io-client"
import { LogOut, MessageSquare, Users } from "lucide-react"

const socket = io("https://chat-backend-production-b501.up.railway.app")

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

  return (
    <ProtectedRoute>
      <>
        {!selectedUser ? (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-violet-500 rounded-t-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold">ChatApp</h1>
                  {currentUser && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="font-bold">{currentUser?.username?.charAt(0).toUpperCase() || "?"}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-sm truncate max-w-[100px]">{currentUser?.username}</div>
                          <button onClick={logout} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                            <LogOut className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main content */}
              <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Available Users
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">Select a user to start chatting</p>
                </div>

                {/* User list */}
                <div className="p-3">
                  {loading ? (
                    <div className="flex justify-center items-center p-6">
                      <div className="flex space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center p-6 text-red-500 text-sm">{error}</div>
                  ) : users.length === 0 ? (
                    <div className="text-center p-6 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No users available to chat with</p>
                    </div>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {users.map((user) => (
                        <li key={user._id}>
                          <button
                            onClick={() => handleUserClick(user)}
                            className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-purple-200 bg-white hover:bg-purple-50 transition-all duration-200 shadow-sm hover:shadow-md group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-base group-hover:scale-110 transition-transform">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-800 group-hover:text-purple-700 transition-colors text-sm truncate">
                                  {currentUser?.username === user.username ? "You" : user.username}
                                </div>
                              </div>
                              <div className="ml-auto">
                                <div className="p-1.5 rounded-full bg-purple-100 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MessageSquare className="h-4 w-4" />
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
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500">
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
