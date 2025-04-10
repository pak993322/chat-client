"use client"
import { useState, useEffect, useRef } from "react"
import io from "socket.io-client"
import axios from "axios"
import ProtectedRoute from "../components/ProtectedRoute"
import { Check } from "lucide-react"
import { FileCheck } from "lucide-react"
import { FileImage } from "lucide-react"
import { CheckSquare } from "lucide-react"
import { Menu } from "lucide-react"
import { MessageCircleMore } from "lucide-react"
import { Mic } from "lucide-react"
import { MoveLeft } from "lucide-react"
import { RefreshCcw } from "lucide-react"
import { SendHorizonal } from "lucide-react"
import { Trash2 } from "lucide-react"
import { X } from "lucide-react"
import { Trash } from "lucide-react"
import { Paperclip } from "lucide-react"
import { LoaderCircle } from "lucide-react"
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
  // Add these new state variables at the top with the other state declarations
  const [selectedMessages, setSelectedMessages] = useState([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    e.preventDefault();
    if (
      (!message.trim() && imageFiles.length === 0 && audioFiles.length === 0 && documentFiles.length === 0) ||
      !currentUser
    )
      return;

    setIsSending(true);

    const sendMessage = (data) => {
      socket.emit("chat message", {
        senderId: currentUser.id,
        receiverId: chatid,
        username: currentUser.username,
        message: data.message || "", // allow empty if just file
        imageUrls: data.imageUrls || [],
        audioUrls: data.audioUrls || [],
        documentUrls: data.documentUrls || [],
        timestamp: new Date().toISOString(),
      });
    };

    // Send text message if present
    if (message.trim()) {
      sendMessage({ message: message.trim() });
    }

    // Handle image upload
    if (imageFiles.length > 0) {
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append("images", file));

      try {
        const uploadResponse = await axios.post("https://chat-backend-production-b501.up.railway.app/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        for (const url of uploadResponse.data.imageUrls) {
          sendMessage({ imageUrls: [url] }); // send one image per message
        }
      } catch (err) {
        console.error("Error uploading images:", err);
      }
    }

    // Handle audio upload
    if (audioFiles.length > 0) {
      const formData = new FormData();
      audioFiles.forEach((file) => formData.append("audio", file));

      try {
        const uploadResponse = await axios.post("https://chat-backend-production-b501.up.railway.app/api/upload-audio", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        for (const url of uploadResponse.data.audioUrls) {
          sendMessage({ audioUrls: [url] }); // send one audio per message
        }
      } catch (err) {
        console.error("Error uploading audio:", err);
      }
    }

    // Handle document upload
    if (documentFiles.length > 0) {
      const formData = new FormData();
      documentFiles.forEach((file) => formData.append("documents", file));

      try {
        const uploadResponse = await axios.post("https://chat-backend-production-b501.up.railway.app/api/upload-document", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        for (const url of uploadResponse.data.documentUrls) {
          sendMessage({ documentUrls: [url] }); // send one document per message
        }
      } catch (err) {
        console.error("Error uploading documents:", err);
      }
    }

    // Reset fields
    setMessage("");
    setImageFiles([]);
    setImagePreviews([]);
    setAudioFiles([]);
    setAudioPreviews([]);
    setDocumentFiles([]);
    setDocumentPreviews([]);
    socket.off("stop typing", {
      senderId: currentUser.id,
      receiverId: chatid,
    });
    setIsTyping(false);
    setIsSending(false);
  };


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

  // Add a function to manually refresh last seen status
  const refreshLastSeen = async () => {
    if (!chatid) return

    try {
      const response = await axios.get(`https://chat-backend-production-b501.up.railway.app/api/user/last-seen/${chatid}`)
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
        const res = await axios.get(`https://chat-backend-production-b501.up.railway.app/api/userlistwithchat/${currentUser.id}`)
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
        xhr.open("POST", `https://chat-backend-production-b501.up.railway.app/api/user/update-last-seen/${currentUser.id}`, false)
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

  // Add this useEffect to listen for message deletion events
  useEffect(() => {
    if (!currentUser) return

    // Listen for single message deletion
    socket.on("message deleted", ({ messageId }) => {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== messageId))
      // Also remove from selected messages if in selection mode
      setSelectedMessages((prev) => prev.filter((id) => id !== messageId))
    })

    // Listen for batch message deletion
    socket.on("messages batch deleted", ({ messageIds }) => {
      setMessages((prevMessages) => prevMessages.filter((msg) => !messageIds.includes(msg._id)))
      // Also remove from selected messages if in selection mode
      setSelectedMessages((prev) => prev.filter((id) => !messageIds.includes(id)))
    })

    return () => {
      socket.off("message deleted")
      socket.off("messages batch deleted")
    }
  }, [currentUser])

  // Add this function to handle message selection
  const toggleMessageSelection = (messageId) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter((id) => id !== messageId))
    } else {
      setSelectedMessages([...selectedMessages, messageId])
    }
  }

  // Add this function to delete a single message
  const deleteMessage = async (messageId) => {
    if (!currentUser || !messageId) return

    try {
      // First check if the message belongs to the current user
      const messageToDelete = messages.find((msg) => msg._id === messageId)
      if (!messageToDelete || messageToDelete.sender?._id !== currentUser.id) {
        console.error("Cannot delete: message not found or not yours")
        return
      }

      // Delete via socket for real-time updates
      socket.emit("delete message", {
        messageId,
        senderId: currentUser.id,
      })

      // Also delete via REST API as a fallback
      await axios.delete(`https://chat-backend-production-b501.up.railway.app/api/messages/${messageId}`)
    } catch (err) {
      console.error("Error deleting message:", err)
    }
  }

  // Add this function to delete multiple messages
  const deleteSelectedMessages = async () => {
    if (!currentUser || selectedMessages.length === 0) return

    setIsDeleting(true)

    try {
      // Filter to only include messages that belong to the current user
      const messagesToDelete = messages
        .filter((msg) => selectedMessages.includes(msg._id) && msg.sender?._id === currentUser.id)
        .map((msg) => msg._id)

      if (messagesToDelete.length === 0) {
        setIsDeleting(false)
        return
      }

      // Delete via socket for real-time updates
      socket.emit("delete messages batch", {
        messageIds: messagesToDelete,
        senderId: currentUser.id,
      })

      // Also delete via REST API as a fallback
      // Use POST instead of DELETE for batch operations to avoid URL path issues
      // Delete via REST API as a fallback
      await axios.delete("https://chat-backend-production-b501.up.railway.app/api/messages/batch", {
        data: { messageIds: messagesToDelete },
      })


      // Clear selection
      setSelectedMessages([])
      setIsSelectionMode(false)
    } catch (err) {
      console.error("Error deleting messages:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Add this function to toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      // Clear selections when exiting selection mode
      setSelectedMessages([])
    }
  }

  // Update the renderDocumentMessage function to complete it
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
  const handleUserChatDelete = (chatId) => {
    const deleteChat = async (currentUserId, chatWithId) => {
      try {
        const response = await fetch("https://chat-backend-production-b501.up.railway.app/chat", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ currentUserId, chatWithId }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Chat deleted successfully:", data);
          const fetchChatUsers = async () => {
            try {
              const res = await axios.get(`https://chat-backend-production-b501.up.railway.app/api/userlistwithchat/${currentUser.id}`)
              setChatUsers(res.data)
              setChatId(res.data[0]?.chatWithId)
              setActiveChatUser(res.data[0]?.chatWithId)
              setTypingStatus(false)
              if (!res.data[0]) {
                if (typeof window !== "undefined") {
                  const event = new CustomEvent("backToUserList", { detail: { id } })
                  window.dispatchEvent(event)
                }
              }
              // Reset unread messages for this chat
              setUnreadMessages((prev) => ({
                ...prev,
                [res.data[0]?.chatWithId]: 0,
              }))

              // On mobile, close sidebar after selecting a user
              if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
              }
            } catch (err) {
              console.error("Error fetching chat users:", err)
            }
          }

          fetchChatUsers()
        } else {
          console.log("Error:", data.message);
        }
      } catch (error) {
        console.error("An error occurred:", error);
      }
    };

    // Call the deleteChat function
    deleteChat(currentUser.id, chatId);

  }
  return (
<ProtectedRoute>
<div className="flex flex-col h-screen w-full mx-auto rounded-xl shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden border border-gray-200">
      {/* Header - Improved responsive design */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white p-2 sm:p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div
            className="flex cursor-pointer items-center space-x-1"
            onClick={() => {
              if (typeof window !== "undefined") {
                const event = new CustomEvent("backToUserList", { detail: { id } })
                window.dispatchEvent(event)
              }
            }}
          >
            <MoveLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <h1 className="text-base sm:text-xl font-bold">Back</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Selection mode toggle button */}
          <button
            onClick={toggleSelectionMode}
            className={`p-1.5 sm:p-2 rounded-full transition-colors ${isSelectionMode ? "bg-white/30" : "hover:bg-white/20"}`}
            title={isSelectionMode ? "Exit selection mode" : "Select messages"}
          >
            <Trash className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Select All button - only show when in selection mode */}
          {isSelectionMode && (
            <button
              onClick={() => {
                const senderMessages = messages
                  .filter((msg) => msg.sender?._id === currentUser?.id)
                  .map((msg) => msg._id)
                setSelectedMessages(senderMessages)
              }}
              className="p-1 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-1"
              title="Select all my messages"
            >
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs hidden sm:inline">Select All</span>
            </button>
          )}

          {/* Delete selected messages button - only show when in selection mode and messages are selected */}
          {isSelectionMode && selectedMessages.length > 0 && (
            <button
              onClick={deleteSelectedMessages}
              disabled={isDeleting}
              className="p-1 sm:p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors flex items-center gap-1"
              title="Delete selected messages"
            >
              {isDeleting ? (
                <svg
                  className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm">{selectedMessages.length}</span>
                </>
              )}
            </button>
          )}

          <div className="text-xs sm:text-sm opacity-90 hidden sm:block truncate max-w-[150px] md:max-w-none">
            {currentUser?.username ? `Logged in as ${currentUser.username}` : "Not logged in"}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar for chat users - Improved responsive behavior */}
        <div
          className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
              lg:translate-x-0 transition-transform duration-300 absolute lg:relative z-20 lg:z-0
              w-[85%] sm:w-72 md:w-80 h-[calc(100%-4rem)] bg-white border-r border-gray-200 
              flex flex-col shadow-lg lg:shadow-none`}
        >
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-base sm:text-lg text-gray-700">Conversations</h3>
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
                    className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-all flex items-center gap-2 sm:gap-3
                        ${
                          activeChatUser === user.chatWithId
                            ? "bg-purple-100 border-l-4 border-purple-500"
                            : "hover:bg-gray-100 border-l-4 border-transparent"
                        }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      {onlineUsers[user.chatWithId] && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}

                      {/* Notification badge for unread messages */}
                      {unreadMessages[user.chatWithId] > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 flex items-center justify-center px-1 border-2 border-white shadow-md">
                          {unreadMessages[user.chatWithId]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-gray-800 truncate text-sm sm:text-base">
                          {currentUser.username === user.username ? "You" : user.username}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUserChatDelete(user.chatWithId)
                          }}
                          className="font-medium text-gray-800"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        {onlineUsers[user.chatWithId] ? (
                          <span className="flex items-center text-green-600">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1"></span>
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

        {/* Chat area - Improved responsive layout */}
        <div className="flex flex-col flex-1 bg-gray-50 w-full">
          {/* Chat header */}
          <div className="p-2 sm:p-4 border-b border-gray-200 bg-white shadow-sm flex items-center gap-2 sm:gap-3 justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {activeChatUser && (
                <>
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                      {activeUserName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    {onlineUsers[activeChatUser] && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                      <span className="truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{activeUserName}</span>
                      {onlineUsers[activeChatUser] ? (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full whitespace-nowrap">
                          online
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded-full flex items-center gap-1 whitespace-nowrap">
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
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Refresh messages"
            >
              <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </button>
          </div>

          {/* Messages - Improved responsive layout */}
          <div className="flex-1 p-2 sm:p-4 overflow-y-auto bg-gray-50 bg-opacity-60 backdrop-blur-sm">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircleMore className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50" />
                <p className="text-center text-sm sm:text-base">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-6">
                {groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex} className="message-group">
                    {/* Date header */}
                    <div className="flex justify-center mb-3 sm:mb-4">
                      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                        {group.date}
                      </div>
                    </div>

                    {/* Messages for this date */}
                    <ul className="space-y-2 sm:space-y-3">
                      {group.messages.map((msg, index) => (
                        <li
                          key={msg._id || index}
                          className={`relative ${isSelectionMode ? "cursor-pointer" : ""}`}
                          onClick={() => isSelectionMode && toggleMessageSelection(msg._id)}
                        >
                          {/* Message container with selection highlight only for sender messages */}
                          <div
                            className={`${
                              selectedMessages.includes(msg._id) && msg.sender?._id === currentUser?.id
                                ? "ring-2 ring-purple-400 ring-offset-2"
                                : ""
                            }`}
                          >
                            {/* Selection checkbox - only show for user's own messages when in selection mode */}
                            {isSelectionMode && msg.sender?._id === currentUser.id && (
                              <div className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 z-10">
                                <div
                                  className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded border-2 flex items-center justify-center ${
                                    selectedMessages.includes(msg._id)
                                      ? "bg-purple-500 border-purple-500"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {selectedMessages.includes(msg._id) && (
                                    <Check className="h-2 w-2 sm:h-3 sm:w-3 md:h-4 md:w-4 text-white" />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Text message */}
                            {msg.content && (
                              <div
                                className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`group relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm
                                      ${
                                        msg.sender?._id === currentUser?.id
                                          ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-br-none"
                                          : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                                      }`}
                                >
                                  <div className="font-semibold text-xs opacity-75 mb-0.5 sm:mb-1">
                                    {msg.sender?.username}
                                  </div>
                                  <div className="break-words text-xs sm:text-sm md:text-base">{msg.content}</div>
                                  <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1 text-right">
                                    {formatMessageTime(msg.timestamp)}
                                    {renderSeenStatus(msg)}
                                  </div>

                                  {/* Delete button - only show for user's own messages */}
                                  {msg.sender?._id === currentUser?.id && !isSelectionMode && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteMessage(msg._id)
                                      }}
                                      className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      aria-label="Delete message"
                                    >
                                      <X className="w-2 h-2 sm:w-3 sm:h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Image messages - each in its own bubble */}
                            {msg.imageUrls &&
                              msg.imageUrls.length > 0 &&
                              msg.imageUrls.map((url, idx) => (
                                <div
                                  key={`${index}-img-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`group relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm
                                        ${
                                          msg.sender?._id === currentUser?.id
                                            ? "bg-white text-gray-800 border border-purple-200"
                                            : "bg-white text-gray-800 border border-gray-200"
                                        }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-0.5 sm:mb-1">
                                      {msg.sender?.username}
                                    </div>
                                    <div className="image-container relative">
                                      <img
                                        src={url || "/placeholder.svg"}
                                        alt={`Shared image ${idx + 1}`}
                                        className="max-w-full rounded-md max-h-40 sm:max-h-60 object-contain"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          downloadImage(url, getFilenameFromUrl(url))
                                        }}
                                        className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-white rounded-full p-1 sm:p-2 shadow-md hover:bg-gray-100 transition-colors"
                                        aria-label="Download image"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-700"
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
                                    <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 text-right">
                                      {formatMessageTime(msg.timestamp)}
                                      {renderSeenStatus(msg)}
                                    </div>

                                    {/* Delete button - only show for user's own messages */}
                                    {msg.sender?._id === currentUser?.id && !isSelectionMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteMessage(msg._id)
                                        }}
                                        className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Delete message"
                                      >
                                        <X className="w-2 h-2 sm:w-3 sm:h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                            {/* Audio messages */}
                            {msg.audioUrls &&
                              msg.audioUrls.length > 0 &&
                              msg.audioUrls.map((url, idx) => (
                                <div
                                  key={`${index}-audio-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`group relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm
                                        ${
                                          msg.sender?._id === currentUser?.id
                                            ? "bg-white text-gray-800 border border-purple-200"
                                            : "bg-white text-gray-800 border border-gray-200"
                                        }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-0.5 sm:mb-1">
                                      {msg.sender?.username}
                                    </div>
                                    {renderAudioMessage(url, idx, msg)}

                                    {/* Delete button - only show for user's own messages */}
                                    {msg.sender?._id === currentUser?.id && !isSelectionMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteMessage(msg._id)
                                        }}
                                        className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Delete message"
                                      >
                                        <X className="w-2 h-2 sm:w-3 sm:h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                            {/* Document messages */}
                            {msg.documentUrls &&
                              msg.documentUrls.length > 0 &&
                              msg.documentUrls.map((url, idx) => (
                                <div
                                  key={`${index}-doc-${idx}`}
                                  className={`flex ${msg.sender?._id === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`group relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm
                                        ${
                                          msg.sender?._id === currentUser?.id
                                            ? "bg-white text-gray-800 border border-purple-200"
                                            : "bg-white text-gray-800 border border-gray-200"
                                        }`}
                                  >
                                    <div className="font-semibold text-xs text-gray-500 mb-0.5 sm:mb-1">
                                      {msg.sender?.username}
                                    </div>
                                    {renderDocumentMessage(url, idx, msg)}

                                    {/* Delete button - only show for user's own messages */}
                                    {msg.sender?._id === currentUser?.id && !isSelectionMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteMessage(msg._id)
                                        }}
                                        className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Delete message"
                                      >
                                        <X className="w-2 h-2 sm:w-3 sm:h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input area - Improved responsive design */}
          <div className="bg-white border-t border-gray-200">
            {/* Preview area for images, audio, and documents */}
            {(imagePreviews.length > 0 || audioPreviews.length > 0 || documentPreviews.length > 0) && (
              <div className="m-2 p-1 sm:p-2 bg-gray-50 rounded-lg border border-gray-200">
                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <div className="mb-1 sm:mb-2">
                    <div className="text-xs font-medium text-gray-500 mb-0.5 sm:mb-1">Images</div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-md overflow-hidden"
                        >
                          <img
                            src={preview || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"
                            aria-label="Remove image"
                          >
                            <X className="w-2 h-2 sm:w-3 sm:h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio previews */}
                {audioPreviews.length > 0 && (
                  <div className="mb-1 sm:mb-2">
                    <div className="text-xs font-medium text-gray-500 mb-0.5 sm:mb-1">Audio</div>
                    <div className="flex flex-col gap-1 sm:gap-2">
                      {audioPreviews.map((preview, index) => (
                        <div key={index} className="flex items-center gap-1 sm:gap-2 bg-white p-1 sm:p-2 rounded-md">
                          <div className="flex-1">
                            <audio src={preview.url} controls className="w-full h-6 sm:h-8" />
                          </div>
                          <button
                            onClick={() => removeAudio(index)}
                            className="bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"
                            aria-label="Remove audio"
                          >
                            <X className="w-2 h-2 sm:w-3 sm:h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document previews */}
                {documentPreviews.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-0.5 sm:mb-1">Documents</div>
                    <div className="flex flex-col gap-1 sm:gap-2">
                      {documentPreviews.map((preview, index) => (
                        <div key={index} className="flex items-center gap-1 sm:gap-2 bg-white p-1 sm:p-2 rounded-md">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                            <FileCheck className="text-gray-500 h-3 w-3 sm:h-4 sm:w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{preview.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">{formatFileSize(preview.size)}</p>
                          </div>
                          <button
                            onClick={() => removeDocument(index)}
                            className="bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"
                            aria-label="Remove document"
                          >
                            <X className="w-2 h-2 sm:w-3 sm:h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message form */}
            <form onSubmit={handleSubmit} className="p-2 flex gap-1 sm:gap-2 items-center">
              {isRecording ? (
                <div className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-red-300 rounded-full bg-red-50 flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="animate-pulse">
                      <span className="inline-block w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></span>
                    </span>
                    <span className="text-red-600 font-medium text-xs sm:text-sm">
                      Recording {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-red-500 text-white rounded-full p-1 sm:p-2 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-2 w-2 sm:h-3 sm:w-3" />
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
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm text-sm"
                  placeholder="Type a message..."
                />
              )}

              {/* FileCheck attachment button with dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSelectFile(!slectfile)}
                  className="p-2 sm:p-3 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center shadow-sm"
                >
                  <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                </button>

                {/* Update the paperclip menu to include document upload option */}
                {slectfile && (
                  <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-40 sm:w-48 z-10 paperclip-menu">
                    <div className="space-y-1 sm:space-y-2">
                      <label className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageSelect}
                          ref={fileInputRef}
                        />
                        <FileImage className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <span className="text-xs sm:text-sm">Upload Image</span>
                        {imageFiles.length > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center ml-auto">
                            {imageFiles.length}
                          </span>
                        )}
                      </label>

                      <label className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="audio/*"
                          multiple
                          className="hidden"
                          onChange={handleAudioSelect}
                          ref={audioInputRef}
                        />
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <span className="text-xs sm:text-sm">Upload Audio</span>
                        {audioFiles.length > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center ml-auto">
                            {audioFiles.length}
                          </span>
                        )}
                      </label>

                      {/* Add document upload option */}
                      <label className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          multiple
                          className="hidden"
                          onChange={handleDocumentSelect}
                          ref={documentInputRef}
                        />
                        <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <span className="text-xs sm:text-sm">Upload Document</span>
                        {documentFiles.length > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center ml-auto">
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
                className={`p-2 sm:p-3 rounded-full flex items-center justify-center shadow-sm relative ${
                  isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full hover:from-purple-600 hover:to-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md flex items-center justify-center"
              >
                {isSending ? (
                  <LoaderCircle className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                ) : (
                  <SendHorizonal className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
</ProtectedRoute>

  )
}
