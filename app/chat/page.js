"use client"
import { useState, useEffect, useRef } from "react"
import React from "react"
import { Paperclip } from "lucide-react"
import io from "socket.io-client"
import axios from "axios"
import ProtectedRoute from "../components/ProtectedRoute"
import { ArrowLeftFromLine } from "lucide-react"

const socket = io("https://chat-backend-production-b501.up.railway.app")

export default function Chat({ id }) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [chatUsers, setChatUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [chatid, setChatId] = useState(id)
  const [activeChatUser, setActiveChatUser] = useState(null)
  const [typingStatus, setTypingStatus] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [lastSeen, setLastSeen] = useState({})
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [onlineUsers, setOnlineUsers] = useState({})
  // Add a new state for tracking seen messages
  const [seenMessages, setSeenMessages] = useState({})
  // Add these new state variables at the top with the other state declarations
  const [isRecording, setIsRecording] = useState(false)
  const [audioFiles, setAudioFiles] = useState([])
  const [audioPreviews, setAudioPreviews] = useState([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioRecorder, setAudioRecorder] = useState(null)
  const [audioChunks, setAudioChunks] = useState([])
  const [recordingInterval, setRecordingInterval] = useState(null)
  const audioInputRef = useRef(null)
  console.log("imagrref", fileInputRef)
  let typingTimeout
  const [slectfile, setSelectFile] = useState(false)
  // Add a new state variable for tracking unread messages at the top with other state declarations:
  const [unreadMessages, setUnreadMessages] = useState({})
  // Add these new state variables at the top with the other state declarations
  const [documentFiles, setDocumentFiles] = useState([])
  const [documentPreviews, setDocumentPreviews] = useState([])
  const documentInputRef = useRef(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      socket.emit("register", currentUser.id)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    // Listen for user online status updates
    socket.on("users online", (onlineUserIds) => {
      const onlineUsersMap = {}
      onlineUserIds.forEach((id) => {
        onlineUsersMap[id] = true
      })
      setOnlineUsers(onlineUsersMap)
    })

    // Listen for last seen updates
    socket.on("user last seen", ({ userId, timestamp }) => {
      setLastSeen((prev) => ({
        ...prev,
        [userId]: timestamp,
      }))
    })

    return () => {
      socket.off("users online")
      socket.off("user last seen")
    }
  }, [currentUser])

  // Add this useEffect to mark messages as seen when viewing a chat
  useEffect(() => {
    if (!currentUser || !chatid || messages.length === 0) return

    // Check if there are any unseen messages from the other user
    const hasUnseenMessages = messages.some((msg) => msg.sender?._id === chatid && !msg.seen)

    if (hasUnseenMessages) {
      // Mark messages as seen via socket
      socket.emit("mark messages seen", {
        userId: currentUser.id,
        chatWithId: chatid,
      })

      // Update local state to show messages as seen
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.sender?._id === chatid && !msg.seen ? { ...msg, seen: true, seenAt: new Date().toISOString() } : msg,
        ),
      )
    }
  }, [currentUser, chatid, messages])

  // Add socket listener for seen messages
  useEffect(() => {
    if (!currentUser) return

    socket.on("messages seen", ({ by, at }) => {
      if (by === chatid) {
        // Update messages that were seen
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.sender?._id === currentUser.id && !msg.seen ? { ...msg, seen: true, seenAt: at } : msg,
          ),
        )
      }
    })

    return () => {
      socket.off("messages seen")
    }
  }, [currentUser, chatid])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingStatus])

  // Add this function to handle audio file selection
  const handleAudioSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setAudioFiles((prev) => [...prev, ...files])

      // Create previews for each file
      files.forEach((file) => {
        const audioUrl = URL.createObjectURL(file)
        setAudioPreviews((prev) => [...prev, { url: audioUrl, name: file.name }])
      })
    }
  }

  // Add this function to remove audio
  const removeAudio = (index) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index))
    setAudioPreviews((prev) => prev.filter((_, i) => i !== index))

    // Reset file input if all audio files are removed
    if (audioFiles.length <= 1 && audioInputRef.current) {
      audioInputRef.current.value = ""
    }
  }

  // Add these functions to handle audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          setAudioChunks([...chunks])
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        const audioUrl = URL.createObjectURL(blob)
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" })

        setAudioFiles((prev) => [...prev, file])
        setAudioPreviews((prev) => [...prev, { url: audioUrl, name: file.name }])

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      // Start recording
      recorder.start()
      setAudioRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      setRecordingInterval(interval)
    } catch (err) {
      console.error("Error starting recording:", err)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (audioRecorder && audioRecorder.state !== "inactive") {
      audioRecorder.stop()
      clearInterval(recordingInterval)
      setIsRecording(false)
      setRecordingInterval(null)
    }
  }

  // Format recording time (MM:SS)
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const secs = (seconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (
      (!message.trim() && imageFiles.length === 0 && audioFiles.length === 0 && documentFiles.length === 0) ||
      !currentUser
    )
      return

    let imageData = []
    let audioData = []
    let documentData = []

    // Upload images if present
    if (imageFiles.length > 0) {
      const formData = new FormData()
      imageFiles.forEach((file) => {
        formData.append("images", file)
      })

      try {
        const uploadResponse = await axios.post("https://chat-backend-production-b501.up.railway.app/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        imageData = uploadResponse.data.imageUrls
      } catch (err) {
        console.error("Error uploading images:", err)
        return
      }
    }

    // Upload audio files if present
    if (audioFiles.length > 0) {
      const formData = new FormData()
      audioFiles.forEach((file) => {
        formData.append("audio", file)
      })

      try {
        const uploadResponse = await axios.post("https://chat-backend-production-b501.up.railway.app/api/upload-audio", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        audioData = uploadResponse.data.audioUrls
      } catch (err) {
        console.error("Error uploading audio:", err)
        return
      }
    }

    // Upload document files if present
    if (documentFiles.length > 0) {
      const formData = new FormData()
      documentFiles.forEach((file) => {
        formData.append("documents", file)
      })

      try {
        const uploadResponse = await axios.post("https://chat-backend-production-b501.up.railway.app/api/upload-document", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        documentData = uploadResponse.data.documentUrls
      } catch (err) {
        console.error("Error uploading documents:", err)
        return
      }
    }

    const newMessage = {
      senderId: currentUser.id,
      receiverId: chatid,
      username: currentUser.username,
      message: message.trim(),
      imageUrls: imageData,
      audioUrls: audioData,
      documentUrls: documentData,
      timestamp: new Date().toISOString(),
    }

    socket.emit("chat message", newMessage)
    setMessage("")
    setImageFiles([])
    setImagePreviews([])
    setAudioFiles([])
    setAudioPreviews([])
    setDocumentFiles([])
    setDocumentPreviews([])
    socket.off("stop typing", {
      senderId: currentUser.id,
      receiverId: chatid,
    })
    setIsTyping(false)
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setImageFiles((prev) => [...prev, ...files])

      // Create previews for each file
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))

    // Reset file input if all images are removed
    if (imageFiles.length <= 1 && fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleTyping = () => {
    if (!isTyping) {
      socket.emit("typing", {
        senderId: currentUser.id,
        receiverId: chatid,
      })
      setIsTyping(true)
    }

    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      socket.emit("stop typing", {
        senderId: currentUser.id,
        receiverId: chatid,
      })
      setIsTyping(false)
    }, 1500)
  }

  const downloadImage = (url, filename) => {
    // Create a new XMLHttpRequest
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url, true)
    xhr.responseType = "blob"

    xhr.onload = function () {
      if (this.status === 200) {
        // Create a blob URL from the response
        const blob = new Blob([this.response], { type: "image/jpeg" })
        const blobUrl = URL.createObjectURL(blob)

        // Create a link element and trigger download
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = filename || "image.jpg"

        // Append to body, click and remove
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the blob URL
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl)
        }, 100)
      }
    }

    xhr.send()
  }

  // Add a function to handle manual refresh of messages
  // Add this function after the other handler functions:

  const refreshMessages = async () => {
    if (!currentUser || !chatid) return

    try {
      const response = await axios.get("https://chat-backend-production-b501.up.railway.app/api/messages", {
        params: { userId: currentUser.id, chatWithId: chatid },
      })
      setMessages(response.data)

      // Mark messages as seen
      if (response.data.some((msg) => msg.sender?._id === chatid && !msg.seen)) {
        socket.emit("mark messages seen", {
          userId: currentUser.id,
          chatWithId: chatid,
        })
      }
    } catch (err) {
      console.error("Error refreshing messages:", err)
    }
  }

  useEffect(() => {
    if (!currentUser || !chatid) return

    setActiveChatUser(chatid)

    const fetchMessages = async () => {
      try {
        const response = await axios.get("https://chat-backend-production-b501.up.railway.app/api/messages", {
          params: { userId: currentUser.id, chatWithId: chatid },
        })
        console.log("woooo", response.data)
        console.log("Messages with timestamps:", response.data)
        setMessages(response.data)
      } catch (err) {
        console.error("Error fetching messages:", err)
      }
    }

    fetchMessages()

    socket.off("chat message")
    // Modify the socket.on("chat message") handler in the useEffect that depends on [currentUser, chatid] to track unread messages:
    socket.on("chat message", (newMessage) => {
      const isSenderChattingWithYou = newMessage.sender?._id === chatid && newMessage.receiver?._id === currentUser.id
      const isYouChattingWithReceiver = newMessage.sender?._id === currentUser.id && newMessage.receiver?._id === chatid

      // Ensure the message has a timestamp
      if (!newMessage.timestamp) {
        newMessage.timestamp = new Date().toISOString()
      }

      if (isSenderChattingWithYou || isYouChattingWithReceiver) {
        // Mark message as seen immediately if you're the receiver and looking at this chat
        if (isSenderChattingWithYou) {
          // Emit seen event
          socket.emit("mark messages seen", {
            userId: currentUser.id,
            chatWithId: chatid,
          })

          // Add seen property to the message
          newMessage.seen = true
          newMessage.seenAt = new Date().toISOString()
        }

        // Use a function to update state to ensure we're working with the latest state
        setMessages((prevMessages) => [...prevMessages, newMessage])
      } else if (newMessage.receiver?._id === currentUser.id) {
        // Message is for current user but not in the active chat
        setUnreadMessages((prev) => ({
          ...prev,
          [newMessage.sender?._id]: (prev[newMessage.sender?._id] || 0) + 1,
        }))
      }
    })

    // Typing handlers
    socket.off("typing")
    socket.off("stop typing")

    socket.on("typing", ({ senderId }) => {
      if (senderId === chatid) {
        setTypingStatus(true)
      }
    })

    socket.on("stop typing", ({ senderId }) => {
      if (senderId === chatid) {
        setTypingStatus(false)
      }
    })

    return () => {
      socket.off("chat message")
      socket.off("typing")
      socket.off("stop typing")
    }
  }, [currentUser, chatid])

  useEffect(() => {
    // Ping the server every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping")
      } else {
        // Try to reconnect if disconnected
        socket.connect()
        if (currentUser) {
          socket.emit("register", currentUser.id)
        }
      }
    }, 30000)

    return () => clearInterval(pingInterval)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    const fetchChatUsers = async () => {
      try {
        const res = await axios.get(`https://chat-backend-production-b501.up.railway.app/api/userlistwithchat/${currentUser.id}`)
        setChatUsers(res.data)
      } catch (err) {
        console.error("Error fetching chat users:", err)
      }
    }

    fetchChatUsers()
  }, [currentUser])

  // Add code to reset unread messages when changing chats in the handleUserClick function:
  const handleUserClick = (userId) => {
    setChatId(userId)
    setActiveChatUser(userId)
    setTypingStatus(false)

    // Reset unread messages for this chat
    setUnreadMessages((prev) => ({
      ...prev,
      [userId]: 0,
    }))

    // On mobile, close sidebar after selecting a user
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Find active user name
  const activeUserName = chatUsers.find((user) => user.chatWithId === activeChatUser)?.username || "Chat"

  // Function to get filename from URL
  const getFilenameFromUrl = (url) => {
    const parts = url.split("/")
    return parts[parts.length - 1]
  }

  // Function to safely format date
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ""

    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (error) {
      console.error("Error formatting date:", error)
      return ""
    }
  }

  // Function to format last seen time
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "Last seen: Unknown"

    try {
      const lastSeenDate = new Date(timestamp)
      const now = new Date()
      const diffMs = now - lastSeenDate
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) {
        return "Last seen: Just now"
      } else if (diffMins < 60) {
        return `Last seen: ${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`
      } else if (diffHours < 24) {
        return `Last seen: ${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`
      } else if (diffDays < 7) {
        return `Last seen: ${diffDays} ${diffDays === 1 ? "day" : "days"} ago`
      } else {
        return `Last seen: ${lastSeenDate.toLocaleDateString()}`
      }
    } catch (error) {
      console.error("Error formatting last seen date:", error)
      return "Last seen: Unknown"
    }
  }

  // Function to get date group for a message
  const getMessageDateGroup = (timestamp) => {
    if (!timestamp) return "Unknown"

    try {
      const messageDate = new Date(timestamp)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Reset hours to compare just the dates
      const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

      if (messageDateOnly.getTime() === todayOnly.getTime()) {
        return "Today"
      } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
        return "Yesterday"
      } else {
        // Check if it's within the current week
        const daysDiff = Math.floor((todayOnly - messageDateOnly) / (1000 * 60 * 60 * 24))
        if (daysDiff < 7) {
          return messageDate.toLocaleDateString(undefined, { weekday: "long" })
        } else {
          // For older messages, show the full date
          return messageDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        }
      }
    } catch (error) {
      console.error("Error determining message date group:", error)
      return "Unknown"
    }
  }

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {}

    messages.forEach((msg) => {
      if (!msg.timestamp) return

      const dateGroup = getMessageDateGroup(msg.timestamp)
      if (!groups[dateGroup]) {
        groups[dateGroup] = []
      }
      groups[dateGroup].push(msg)
    })

    // Convert to array of objects with date and messages
    return Object.keys(groups).map((date) => ({
      date,
      messages: groups[date],
    }))
  }

  // Add a function to render seen status
  const renderSeenStatus = (msg) => {
    if (msg.sender?._id !== currentUser?.id) return null

    return (
      <div className="text-xs mt-1">
        {msg.seen ? (
          <div className="flex items-center justify-end gap-1 opacity-75">
            <span>Seen {msg.seenAt ? formatMessageTime(msg.seenAt) : ""}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-75">
            <span>Sent</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    )
  }

  // Get grouped messages
  const groupedMessages = groupMessagesByDate(messages)

  // Add this function to render audio messages
  const renderAudioMessage = (url, idx, msg) => {
    return (
      <div className="audio-player w-full">
        <audio src={url} controls className="w-full max-w-[250px] h-10" preload="metadata" />
        <div className="text-xs opacity-75 mt-1 text-right">
          {formatMessageTime(msg.timestamp)}
          {renderSeenStatus(msg)}
        </div>
      </div>
    )
  }

  const handleFileSelect = (e) => {
    setSelectFile(true)
  }

  // Add this useEffect after your other useEffect hooks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (slectfile && !event.target.closest(".paperclip-menu")) {
        setSelectFile(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [slectfile])

  // Add this function to handle document file selection
  const handleDocumentSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setDocumentFiles((prev) => [...prev, ...files])

      // Create previews for each file
      files.forEach((file) => {
        // Determine icon based on file type
        let icon = "file-text"
        if (file.type.includes("pdf")) {
          icon = "file-pdf"
        } else if (file.type.includes("word") || file.type.includes("document")) {
          icon = "file-word"
        } else if (file.type.includes("excel") || file.type.includes("sheet")) {
          icon = "file-spreadsheet"
        }

        setDocumentPreviews((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            icon: icon,
          },
        ])
      })
    }
  }

  // Add this function to remove document
  const removeDocument = (index) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index))
    setDocumentPreviews((prev) => prev.filter((_, i) => i !== index))

    // Reset file input if all document files are removed
    if (documentFiles.length <= 1 && documentInputRef.current) {
      documentInputRef.current.value = ""
    }
  }

  // Add this function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  // Add this function to render document messages
  const renderDocumentMessage = (url, idx, msg, docName = "Document") => {
    // Extract filename from URL
    const filename = docName || getFilenameFromUrl(url)

    // Determine icon based on file extension
    let icon = "file-text"
    const ext = filename.split(".").pop().toLowerCase()
    if (ext === "pdf") {
      icon = "file-pdf"
    } else if (["doc", "docx"].includes(ext)) {
      icon = "file-word"
    } else if (["xls", "xlsx", "csv"].includes(ext)) {
      icon = "file-spreadsheet"
    }

    return (
      <div className="document-container w-full">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            {icon === "file-pdf" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
            {icon === "file-word" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
            {icon === "file-spreadsheet" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
            {icon === "file-text" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
            <p className="text-xs text-gray-500">Click to open</p>
          </div>
        </a>
        <div className="text-xs opacity-75 mt-1 text-right">
          {formatMessageTime(msg.timestamp)}
          {renderSeenStatus(msg)}
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen max-full mx-auto rounded-xl shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="md:hidden p-2 rounded-full hover:bg-white/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div
              className="flex cursor-pointer space-x-[1px]"
              onClick={() => {
                // This will notify the parent component to go back to user list
                if (typeof window !== "undefined") {
                  const event = new CustomEvent("backToUserList", { detail: { id } })
                  window.dispatchEvent(event)
                }
              }}
            >
              <ArrowLeftFromLine className="pt-[2px]" />
              <h1 className="text-xl font-bold">Back</h1>
            </div>
          </div>
          <div className="text-sm opacity-90">
            {currentUser?.username ? `Logged in as ${currentUser.username}` : "Not logged in"}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar for chat users */}
          <div
            className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            md:translate-x-0 transition-transform duration-300 absolute md:relative z-10 md:z-0
            w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 h-[calc(100%-4rem)] bg-white border-r border-gray-200 
            flex flex-col shadow-lg md:shadow-none`}
          >
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-lg text-gray-700">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chatUsers.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">No conversations yet</div>
              ) : (
                <ul className="space-y-1">
                  {/* Modify the chat users list to show notification badges: */}
                  {chatUsers.map((user) => (
                    <li
                      onClick={() => handleUserClick(user.chatWithId)}
                      key={user._id}
                      className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3
                      ${
                        activeChatUser === user.chatWithId
                          ? "bg-purple-100 border-l-4 border-purple-500"
                          : "hover:bg-gray-100 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {onlineUsers[user.chatWithId] && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}

                        {/* Notification badge for unread messages */}
                        {unreadMessages[user.chatWithId] > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-white shadow-md">
                            {unreadMessages[user.chatWithId]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {currentUser.username === user.username ? "You" : user.username}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          {onlineUsers[user.chatWithId] ? (
                            <span className="flex items-center text-green-600">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                              Online
                            </span>
                          ) : (
                            <span className="text-gray-400">Offline</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex flex-col flex-1 bg-gray-50">
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                {activeChatUser && (
                  <>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                        {activeUserName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      {onlineUsers[activeChatUser] && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 flex items-center gap-2">
                        {activeUserName}
                        {onlineUsers[activeChatUser] ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">online</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                            {lastSeen[activeChatUser] ? formatLastSeen(lastSeen[activeChatUser]) : "offline"}
                          </span>
                        )}
                      </div>
                      {typingStatus && <div className="text-xs text-purple-500">typing...</div>}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={refreshMessages}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Refresh messages"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 bg-opacity-60 backdrop-blur-sm">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-center">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMessages.map((group, groupIndex) => (
                    <div key={groupIndex} className="message-group">
                      {/* Date header */}
                      <div className="flex justify-center mb-4">
                        <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                          {group.date}
                        </div>
                      </div>

                      {/* Messages for this date */}
                      <ul className="space-y-3">
                        {group.messages.map((msg, index) => (
                          <React.Fragment key={index}>
                            {/* Text message */}
                            {msg.content && (
                              <li
                                className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm
                                  ${
                                    msg.sender?._id === currentUser?.id
                                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-br-none"
                                      : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                                  }`}
                                >
                                  <div className="font-semibold text-xs opacity-75 mb-1">{msg.sender?.username}</div>
                                  <div className="break-words">{msg.content}</div>
                                  <div className="text-xs opacity-75 mt-1 text-right">
                                    {formatMessageTime(msg.timestamp)}
                                    {renderSeenStatus(msg)}
                                  </div>
                                </div>
                              </li>
                            )}

                            {/* Image messages - each in its own bubble */}
                            {msg.imageUrls &&
                              msg.imageUrls.length > 0 &&
                              msg.imageUrls.map((url, idx) => (
                                <li
                                  key={`${index}-img-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm
                                    ${
                                      msg.sender?._id === currentUser?.id
                                        ? "bg-white text-gray-800 border border-purple-200"
                                        : "bg-white text-gray-800 border border-gray-200"
                                    }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-1">
                                      {msg.sender?.username}
                                    </div>
                                    <div className="image-container relative">
                                      <img
                                        src={url || "/placeholder.svg"}
                                        alt={`Shared image ${idx + 1}`}
                                        className="max-w-full rounded-md max-h-60 object-contain"
                                      />
                                      <button
                                        onClick={() => downloadImage(url, getFilenameFromUrl(url))}
                                        className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
                                        aria-label="Download image"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-5 w-5 text-gray-700"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 text-right">
                                      {formatMessageTime(msg.timestamp)}
                                      {renderSeenStatus(msg)}
                                    </div>
                                  </div>
                                </li>
                              ))}

                            {/* Audio messages */}
                            {msg.audioUrls &&
                              msg.audioUrls.length > 0 &&
                              msg.audioUrls.map((url, idx) => (
                                <li
                                  key={`${index}-audio-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm
                                    ${
                                      msg.sender?._id === currentUser?.id
                                        ? "bg-white text-gray-800 border border-purple-200"
                                        : "bg-white text-gray-800 border border-gray-200"
                                    }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-1">
                                      {msg.sender?.username}
                                    </div>
                                    {renderAudioMessage(url, idx, msg)}
                                  </div>
                                </li>
                              ))}

                            {/* Add document messages rendering in the messages section */}
                            {msg.documentUrls &&
                              msg.documentUrls.length > 0 &&
                              msg.documentUrls.map((url, idx) => (
                                <li
                                  key={`${index}-doc-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm
                                    ${
                                      msg.sender?._id === currentUser?.id
                                        ? "bg-white text-gray-800 border border-purple-200"
                                        : "bg-white text-gray-800 border border-gray-200"
                                    }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-1">
                                      {msg.sender?.username}
                                    </div>
                                    {renderDocumentMessage(url, idx, msg)}
                                  </div>
                                </li>
                              ))}
                          </React.Fragment>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {typingStatus && (
                    <li className="flex justify-start">
                      <div className="bg-gray-200 px-4 py-2 rounded-full text-sm text-gray-500 flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div
                            className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span>typing</span>
                      </div>
                    </li>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {imagePreviews.length > 0 && (
              <div className="p-3 border-t bg-white">
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview || "/placeholder.svg"}
                        alt={`Preview ${index + 1}`}
                        className="h-20 w-auto rounded-lg object-cover border border-gray-200 shadow-sm"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {audioPreviews.length > 0 && (
              <div className="p-3 border-t bg-white">
                <div className="flex flex-wrap gap-2">
                  {audioPreviews.map((preview, index) => (
                    <div key={index} className="relative flex items-center bg-gray-100 rounded-lg p-2 pr-8">
                      <audio src={preview.url} controls className="h-8 w-[200px]" />
                      <button
                        onClick={() => removeAudio(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove audio"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add document previews section after audio previews */}
            {documentPreviews.length > 0 && (
              <div className="p-3 border-t bg-white">
                <div className="flex flex-wrap gap-2">
                  {documentPreviews.map((preview, index) => (
                    <div key={index} className="relative flex items-center bg-gray-100 rounded-lg p-2 pr-8 max-w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          {preview.icon === "file-pdf" && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-red-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                          {preview.icon === "file-word" && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-blue-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                          {preview.icon === "file-spreadsheet" && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-green-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                          {preview.icon === "file-text" && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{preview.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(preview.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove document"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message input */}
            <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2 bg-white">
              {isRecording ? (
                <div className="flex-1 px-4 py-3 border border-red-300 rounded-full bg-red-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse">
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
                    </span>
                    <span className="text-red-600 font-medium">Recording {formatRecordingTime(recordingTime)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    handleTyping()
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  placeholder="Type a message..."
                />
              )}

              {/* File attachment button with dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSelectFile(!slectfile)}
                  className="p-3 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center shadow-sm"
                >
                  <Paperclip className="h-6 w-6 text-gray-600" />
                </button>

                {/* Update the paperclip menu to include document upload option */}
                {slectfile && (
                  <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48 z-10 paperclip-menu">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageSelect}
                          ref={fileInputRef}
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm">Upload Image</span>
                        {imageFiles.length > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                            {imageFiles.length}
                          </span>
                        )}
                      </label>

                      <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="audio/*"
                          multiple
                          className="hidden"
                          onChange={handleAudioSelect}
                          ref={audioInputRef}
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                        <span className="text-sm">Upload Audio</span>
                        {audioFiles.length > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                            {audioFiles.length}
                          </span>
                        )}
                      </label>

                      {/* Add document upload option */}
                      <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          multiple
                          className="hidden"
                          onChange={handleDocumentSelect}
                          ref={documentInputRef}
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm">Upload Document</span>
                        {documentFiles.length > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                            {documentFiles.length}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Record audio button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full flex items-center justify-center shadow-sm relative ${
                  isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>

              <button
                type="submit"
                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full hover:from-purple-600 hover:to-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
