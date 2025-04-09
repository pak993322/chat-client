"use client"
import { useState, useEffect, useRef } from "react"
import React from "react"
import { Paperclip, ArrowLeftFromLine, Mic, Send, X, Download, RefreshCw, Check, CheckCheck } from "lucide-react"
import io from "socket.io-client"
import axios from "axios"
import ProtectedRoute from "../components/ProtectedRoute"

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
  let typingTimeout
  const [slectfile, setSelectFile] = useState(false)
  // Add a new state variable for tracking unread messages at the top with other state declarations:
  const [unreadMessages, setUnreadMessages] = useState({})
  // Add these new state variables at the top with the other state declarations
  const [documentFiles, setDocumentFiles] = useState([])
  const [documentPreviews, setDocumentPreviews] = useState([])
  const [isSending, setIsSending] = useState(false)
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
    setIsSending(true)
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
        const uploadResponse = await axios.post(
          "https://chat-backend-production-b501.up.railway.app/api/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        )
        imageData = uploadResponse.data.imageUrls
      } catch (err) {
        console.error("Error uploading images:", err)
        setIsSending(false)
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
        const uploadResponse = await axios.post(
          "https://chat-backend-production-b501.up.railway.app/api/upload-audio",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        )
        audioData = uploadResponse.data.audioUrls
      } catch (err) {
        console.error("Error uploading audio:", err)
        setIsSending(false)
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
        const uploadResponse = await axios.post(
          "https://chat-backend-production-b501.up.railway.app/api/upload-document",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        )
        documentData = uploadResponse.data.documentUrls
      } catch (err) {
        console.error("Error uploading documents:", err)
        setIsSending(false)
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
    setIsSending(false)
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

  // Add a function to manually refresh last seen status
  const refreshLastSeen = async () => {
    if (!chatid) return

    try {
      const response = await axios.get(
        `https://chat-backend-production-b501.up.railway.app/api/user/last-seen/${chatid}`,
      )
      if (response.data && response.data.lastSeen) {
        setLastSeen((prev) => ({
          ...prev,
          [chatid]: response.data.lastSeen,
        }))
      }
    } catch (err) {
      console.error("Error refreshing last seen status:", err)
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
        const res = await axios.get(
          `https://chat-backend-production-b501.up.railway.app/api/userlistwithchat/${currentUser.id}`,
        )
        setChatUsers(res.data)
      } catch (err) {
        console.error("Error fetching chat users:", err)
      }
    }

    fetchChatUsers()
  }, [currentUser])

  // Add this useEffect to fetch last seen times when the component mounts
  useEffect(() => {
    if (!currentUser) return

    // Listen for initial last seen times
    socket.on("last seen times", (times) => {
      setLastSeen(times)
    })

    // Set up a periodic refresh of last seen status
    const lastSeenInterval = setInterval(() => {
      if (chatid) {
        // Fetch last seen time for the current chat user
        axios
          .get(`https://chat-backend-production-b501.up.railway.app/api/user/last-seen/${chatid}`)
          .then((response) => {
            if (response.data && response.data.lastSeen) {
              setLastSeen((prev) => ({
                ...prev,
                [chatid]: response.data.lastSeen,
              }))
            }
          })
          .catch((err) => console.error("Error fetching last seen:", err))
      }
    }, 60000) // Refresh every minute

    return () => {
      socket.off("last seen times")
      clearInterval(lastSeenInterval)
    }
  }, [currentUser, chatid])

  // Update last seen when component unmounts
  useEffect(() => {
    return () => {
      if (currentUser) {
        // Notify server that user is disconnecting
        socket.emit("disconnectsingleuser", currentUser.id)
      }
    }
  }, [currentUser])

  // Handle page refresh or close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser) {
        // Use a synchronous approach for beforeunload
        const xhr = new XMLHttpRequest()
        xhr.open(
          "POST",
          `https://chat-backend-production-b501.up.railway.app/api/user/update-last-seen/${currentUser.id}`,
          false,
        )
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify({ timestamp: new Date().toISOString() }))

        // Also notify via socket if possible
        socket.emit("disconnectsingleuser", currentUser.id)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
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

      // Check if date is valid
      if (isNaN(lastSeenDate.getTime())) {
        return "Last seen: Unknown"
      }

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
            <CheckCheck className="h-3 w-3" />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-75">
            <span>Sent</span>
            <Check className="h-3 w-3" />
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
      <div className="flex flex-col h-screen w-full mx-auto bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <button onClick={toggleSidebar} className="md:hidden p-2 rounded-full hover:bg-white/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div
              className="flex cursor-pointer items-center gap-1"
              onClick={() => {
                // This will notify the parent component to go back to user list
                if (typeof window !== "undefined") {
                  const event = new CustomEvent("backToUserList", { detail: { id } })
                  window.dispatchEvent(event)
                }
              }}
            >
              <ArrowLeftFromLine className="h-4 w-4" />
              <h1 className="text-base font-bold">Back</h1>
            </div>
          </div>
          <div className="text-xs opacity-90 truncate max-w-[150px]">
            {currentUser?.username ? `${currentUser.username}` : "Not logged in"}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar for chat users */}
          <div
            className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            md:translate-x-0 transition-transform duration-300 absolute md:relative z-10 md:z-0
            w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 h-[calc(100%-3.5rem)] bg-white border-r border-gray-200 
            flex flex-col shadow-lg md:shadow-none`}
          >
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-base text-gray-700">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chatUsers.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">No conversations yet</div>
              ) : (
                <ul className="space-y-1">
                  {chatUsers.map((user) => (
                    <li
                      onClick={() => handleUserClick(user.chatWithId)}
                      key={user._id}
                      className={`p-2 rounded-lg cursor-pointer transition-all flex items-center gap-2
                      ${
                        activeChatUser === user.chatWithId
                          ? "bg-purple-100 border-l-4 border-purple-500"
                          : "hover:bg-gray-100 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {onlineUsers[user.chatWithId] && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}

                        {/* Notification badge for unread messages */}
                        {unreadMessages[user.chatWithId] > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center px-1 border-2 border-white shadow-md">
                            {unreadMessages[user.chatWithId]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm truncate">
                          {currentUser.username === user.username ? "You" : user.username}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          {onlineUsers[user.chatWithId] ? (
                            <span className="flex items-center text-green-600">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
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
            <div className="p-3 border-b border-gray-200 bg-white shadow-sm flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                {activeChatUser && (
                  <>
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                        {activeUserName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      {onlineUsers[activeChatUser] && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 text-sm flex items-center gap-1 truncate">
                        {activeUserName}
                        {onlineUsers[activeChatUser] ? (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full">online</span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded-full truncate max-w-[120px]">
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
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Refresh messages"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 overflow-y-auto bg-gray-50 bg-opacity-60 backdrop-blur-sm">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mb-3 opacity-50"
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
                  <p className="text-center text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedMessages.map((group, groupIndex) => (
                    <div key={groupIndex} className="message-group">
                      {/* Date header */}
                      <div className="flex justify-center mb-3">
                        <div className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          {group.date}
                        </div>
                      </div>

                      {/* Messages for this date */}
                      <ul className="space-y-2">
                        {group.messages.map((msg, index) => (
                          <React.Fragment key={index}>
                            {/* Text message */}
                            {msg.content && (
                              <li
                                className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`px-3 py-2 rounded-2xl max-w-[85%] shadow-sm
                                  ${
                                    msg.sender?._id === currentUser?.id
                                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-br-none"
                                      : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                                  }`}
                                >
                                  <div className="font-semibold text-xs opacity-75 mb-0.5">{msg.sender?.username}</div>
                                  <div className="break-words text-sm">{msg.content}</div>
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
                                    className={`px-3 py-2 rounded-2xl max-w-[85%] shadow-sm
                                    ${
                                      msg.sender?._id === currentUser?.id
                                        ? "bg-white text-gray-800 border border-purple-200"
                                        : "bg-white text-gray-800 border border-gray-200"
                                    }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-0.5">
                                      {msg.sender?.username}
                                    </div>
                                    <div className="image-container relative">
                                      <img
                                        src={url || "/placeholder.svg"}
                                        alt={`Shared image ${idx + 1}`}
                                        className="max-w-full rounded-md max-h-48 object-contain"
                                      />
                                      <button
                                        onClick={() => downloadImage(url, getFilenameFromUrl(url))}
                                        className="absolute bottom-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
                                        aria-label="Download image"
                                      >
                                        <Download className="h-4 w-4 text-gray-700" />
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
                                    className={`px-3 py-2 rounded-2xl max-w-[85%] shadow-sm
                                    ${
                                      msg.sender?._id === currentUser?.id
                                        ? "bg-white text-gray-800 border border-purple-200"
                                        : "bg-white text-gray-800 border border-gray-200"
                                    }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-0.5">
                                      {msg.sender?.username}
                                    </div>
                                    {renderAudioMessage(url, idx, msg)}
                                  </div>
                                </li>
                              ))}

                            {/* Document messages */}
                            {msg.documentUrls &&
                              msg.documentUrls.length > 0 &&
                              msg.documentUrls.map((url, idx) => (
                                <li
                                  key={`${index}-doc-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`px-3 py-2 rounded-2xl max-w-[85%] shadow-sm
                                    ${
                                      msg.sender?._id === currentUser?.id
                                        ? "bg-white text-gray-800 border border-purple-200"
                                        : "bg-white text-gray-800 border border-gray-200"
                                    }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-0.5">
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
                      <div className="bg-gray-200 px-3 py-1.5 rounded-full text-sm text-gray-500 flex items-center gap-1.5">
                        <div className="flex space-x-1">
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span className="text-xs">typing</span>
                      </div>
                    </li>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="p-2 border-t bg-white">
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview || "/placeholder.svg"}
                        alt={`Preview ${index + 1}`}
                        className="h-16 w-auto rounded-lg object-cover border border-gray-200 shadow-sm"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio previews */}
            {audioPreviews.length > 0 && (
              <div className="p-2 border-t bg-white">
                <div className="flex flex-wrap gap-2">
                  {audioPreviews.map((preview, index) => (
                    <div key={index} className="relative flex items-center bg-gray-100 rounded-lg p-2 pr-8">
                      <audio src={preview.url} controls className="h-8 w-[180px]" />
                      <button
                        onClick={() => removeAudio(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove audio"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document previews */}
            {documentPreviews.length > 0 && (
              <div className="p-2 border-t bg-white">
                <div className="flex flex-wrap gap-2">
                  {documentPreviews.map((preview, index) => (
                    <div key={index} className="relative flex items-center bg-gray-100 rounded-lg p-2 pr-8 max-w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="flex-shrink-0 w-7 h-7 bg-gray-200 rounded flex items-center justify-center">
                          {preview.icon === "file-pdf" && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-red-500"
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
                              className="h-4 w-4 text-blue-500"
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
                              className="h-4 w-4 text-green-500"
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
                              className="h-4 w-4 text-gray-500"
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
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove document"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message input */}
            <form onSubmit={handleSubmit} className="p-2 border-t flex gap-2 bg-white">
              {isRecording ? (
                <div className="flex-1 px-3 py-2 border border-red-300 rounded-full bg-red-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    </span>
                    <span className="text-red-600 font-medium text-sm">
                      Recording {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
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
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm text-sm"
                  placeholder="Type a message..."
                />
              )}

              {/* File attachment button with dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSelectFile(!slectfile)}
                  className="p-2 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center shadow-sm"
                >
                  <Paperclip className="h-5 w-5 text-gray-600" />
                </button>

                {/* Paperclip menu */}
                {slectfile && (
                  <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-44 z-10 paperclip-menu">
                    <div className="space-y-1">
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
                          className="h-4 w-4 text-gray-600"
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
                          className="h-4 w-4 text-gray-600"
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

                      {/* Document upload option */}
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
                          className="h-4 w-4 text-gray-600"
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
                className={`p-2 rounded-full flex items-center justify-center shadow-sm relative ${
                  isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Mic className="h-5 w-5" />
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full hover:from-purple-600 hover:to-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md flex items-center justify-center"
              >
                {isSending ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
