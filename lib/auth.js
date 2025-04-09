import axios from "axios"

export const loginUser = async (username, password) => {
  const response = await axios.post("https://chat-backend-production-b501.up.railway.app/api/login", { username, password })
  return response.data
}

export const registerUser = async (username, password) => {
  await axios.post("https://chat-backend-production-b501.up.railway.app/api/register", { username, password })
}

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    return !!token
  }
  return false
}

// Helper function to get the current user
export const getCurrentUser = () => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
  }
  return null
}
