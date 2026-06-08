import { createContext, useContext, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from './AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'

const WebSocketContext = createContext({
  isConnected: false,
  lastMessage: null,
  sendMessage: () => false,
})

export function WebSocketProvider({ children }) {
  const { user } = useAuth()
  const token = user ? localStorage.getItem('access_token') : null
  const websocket = useWebSocket(user?.id, token)

  useEffect(() => {
    const message = websocket.lastMessage
    if (!message || message.type === 'ping' || message.type === 'pong') return

    const titles = {
      task_assigned: () => `📋 New task assigned: ${message.title || 'Task'}`,
      task_completed: () => `✅ ${message.student_name || message.student || 'A student'} completed: ${message.title || 'Task'}`,
      room_join_request: () => '🙋 A student wants to join your room',
      room_approved: () => `🎉 You were approved to join ${message.room_name || 'the room'}`,
      new_comment: () => `💬 New comment on: ${message.title || message.task_title || 'Task'}`,
      streak_milestone: () => `🔥 ${message.streak} day streak! Keep going!`,
    }

    const getToast = titles[message.type]
    if (getToast) toast.success(getToast())
  }, [websocket.lastMessage])

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = () => useContext(WebSocketContext)
