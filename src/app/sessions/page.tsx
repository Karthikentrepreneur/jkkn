'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FaCalendar, FaUser, FaClock, FaCheck, FaTimes } from 'react-icons/fa'
import toast from 'react-hot-toast'

interface Session {
  id: string
  title: string
  description: string
  date: string
  mentor: {
    full_name: string
  }
  mentee: {
    full_name: string
  }
  status: 'upcoming' | 'completed' | 'cancelled'
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'mentor' | 'mentee' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserRole(profile.role as 'mentor' | 'mentee')
        }

        // Fetch sessions
        const { data: sessionsData, error } = await supabase
          .from('sessions')
          .select(`
            *,
            mentor:mentor_id(full_name),
            mentee:mentee_id(full_name)
          `)
          .order('date', { ascending: true })

        if (error) throw error

        if (sessionsData) {
          setSessions(sessionsData)
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
        toast.error('Error loading sessions')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [router])

  const handleStatusUpdate = async (sessionId: string, newStatus: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)

      if (error) throw error

      setSessions(sessions.map(session =>
        session.id === sessionId ? { ...session, status: newStatus } : session
      ))

      toast.success(`Session marked as ${newStatus}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Your Sessions
            </h1>
            <button
              onClick={() => router.push('/sessions/book')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
            >
              Book New Session
            </button>
          </div>

          <div className="grid gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{session.title}</h3>
                    <p className="text-gray-400 mt-1">{session.description}</p>
                    <div className="flex items-center space-x-4 mt-4">
                      <div className="flex items-center text-gray-400">
                        <FaCalendar className="mr-2" />
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <FaClock className="mr-2" />
                        {new Date(session.date).toLocaleTimeString()}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <FaUser className="mr-2" />
                        {userRole === 'mentor' ? session.mentee.full_name : session.mentor.full_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {session.status === 'upcoming' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(session.id, 'completed')}
                          className="p-2 text-green-400 hover:text-green-300 transition-colors"
                          title="Mark as completed"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(session.id, 'cancelled')}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title="Cancel session"
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        session.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : session.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
} 