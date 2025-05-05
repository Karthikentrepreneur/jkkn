'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function CounsellingPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mentors, setMentors] = useState<any[]>([])
  const [formData, setFormData] = useState({
    mentor_id: '',
    date_time: '',
    notes: ''
  })

  useEffect(() => {
    fetchSessions()
    fetchMentors()
  }, [])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('counselling_sessions')
        .select('*, profiles!counselling_sessions_student_id_fkey(full_name), profiles!counselling_sessions_mentor_id_fkey(full_name)')

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const fetchMentors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'mentor')

      if (error) throw error
      setMentors(data || [])
    } catch (error) {
      console.error('Error fetching mentors:', error)
      toast.error('Failed to load mentors')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('counselling_sessions')
        .insert([{
          ...formData,
          student_id: 'demo-student',
          status: 'scheduled'
        }])

      if (error) throw error
      toast.success('Session scheduled successfully')
      setShowModal(false)
      fetchSessions()
    } catch (error) {
      console.error('Error scheduling session:', error)
      toast.error('Failed to schedule session')
    }
  }

  const handleStatusUpdate = async (sessionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('counselling_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)

      if (error) throw error
      toast.success('Session status updated successfully')
      fetchSessions()
    } catch (error) {
      console.error('Error updating session status:', error)
      toast.error('Failed to update session status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Counselling Sessions</h1>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Schedule Session
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Session with {session.profiles?.full_name || 'Demo Mentor'}
                  </h3>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5" />
                    {new Date(session.date_time).toLocaleDateString()}
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <ClockIcon className="flex-shrink-0 mr-1.5 h-5 w-5" />
                    {new Date(session.date_time).toLocaleTimeString()}
                  </div>
                  {session.notes && (
                    <p className="mt-2 text-sm text-gray-500">{session.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {session.status}
                  </span>
                  <select
                    value={session.status}
                    onChange={(e) => handleStatusUpdate(session.id, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Schedule Counselling Session</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="mentor" className="block text-sm font-medium text-gray-700">
                    Select Mentor
                  </label>
                  <select
                    id="mentor"
                    value={formData.mentor_id}
                    onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="">Select a mentor</option>
                    {mentors.map((mentor) => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="date_time" className="block text-sm font-medium text-gray-700">
                    Date and Time
                  </label>
                  <input
                    type="datetime-local"
                    id="date_time"
                    value={formData.date_time}
                    onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
} 