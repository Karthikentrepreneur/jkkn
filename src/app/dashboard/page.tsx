'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FaUser, FaCalendar, FaChartLine, FaBell, FaSearch } from 'react-icons/fa'
import toast from 'react-hot-toast'

interface User {
  id: string
  full_name: string
  role: string
  bio: string
}

interface Session {
  id: string
  title: string
  date: string
  mentor: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

interface Progress {
  completedLessons: number
  totalLessons: number
  currentStreak: number
  achievements: string[]
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [progress, setProgress] = useState<Progress>({
    completedLessons: 0,
    totalLessons: 10,
    currentStreak: 0,
    achievements: []
  })
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUser(profile)
        }

        // Fetch sessions
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: true })

        if (sessionsData) {
          setSessions(sessionsData)
        }

        // Fetch progress
        const { data: progressData } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (progressData) {
          setProgress(progressData)
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
        toast.error('Error loading dashboard data')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
        .neq('id', user?.id)

      if (error) throw error

      // Handle search results
      console.log('Search results:', data)
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
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Welcome back, {user?.full_name}!
              </h1>
              <p className="text-gray-400 mt-1">Here's your learning journey overview</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mentors/mentees..."
                  className="px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <FaSearch />
                </button>
              </div>
              <button
                onClick={() => router.push('/sessions/book')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                Book Session
              </button>
              <button className="p-2 text-gray-400 hover:text-white">
                <FaBell className="text-xl" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400">Learning Progress</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {progress.completedLessons}/{progress.totalLessons}
                  </h3>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <FaChartLine className="text-purple-500 text-xl" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${(progress.completedLessons / progress.totalLessons) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400">Current Streak</p>
                  <h3 className="text-2xl font-bold mt-1">{progress.currentStreak} days</h3>
                </div>
                <div className="p-3 bg-pink-500/20 rounded-lg">
                  <FaCalendar className="text-pink-500 text-xl" />
                </div>
              </div>
              <p className="text-gray-400 mt-4">Keep up the good work!</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400">Upcoming Sessions</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {sessions.filter(s => s.status === 'upcoming').length}
                  </h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <FaUser className="text-blue-500 text-xl" />
                </div>
              </div>
              <p className="text-gray-400 mt-4">Next session in 2 days</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Sessions */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Upcoming Sessions</h2>
              <div className="space-y-4">
                {sessions
                  .filter(s => s.status === 'upcoming')
                  .slice(0, 3)
                  .map(session => (
                    <div
                      key={session.id}
                      className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{session.title}</h3>
                          <p className="text-gray-400 text-sm mt-1">
                            with {session.mentor}
                          </p>
                        </div>
                        <span className="text-sm text-purple-400">
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              <button className="mt-4 text-purple-400 hover:text-purple-300 transition-colors">
                View all sessions →
              </button>
            </div>

            {/* Achievements */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Recent Achievements</h2>
              <div className="space-y-4">
                {progress.achievements.slice(0, 3).map((achievement, index) => (
                  <div
                    key={index}
                    className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <span className="text-yellow-500">🏆</span>
                      </div>
                      <p>{achievement}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-purple-400 hover:text-purple-300 transition-colors">
                View all achievements →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 