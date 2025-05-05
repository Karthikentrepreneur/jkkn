'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FaCalendar, FaClock, FaUser, FaInfoCircle } from 'react-icons/fa'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface Mentor {
  id: string
  full_name: string
  bio: string
  expertise: string[]
}

export default function BookSession() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [selectedMentor, setSelectedMentor] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const router = useRouter()

  // Available time slots
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ]

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch mentors (users with role 'mentor')
        const { data: mentorsData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'mentor')
          .neq('id', user.id)

        if (error) throw error

        if (mentorsData) {
          setMentors(mentorsData)
        }
      } catch (error) {
        console.error('Error loading mentors:', error)
        toast.error('Error loading mentors')
      } finally {
        setLoading(false)
      }
    }

    fetchMentors()
  }, [router])

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMentor || !selectedDate || !selectedTime || !title) {
      toast.error('Please fill in all required fields')
      return
    }

    setBookingLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Combine date and time
      const sessionDateTime = new Date(selectedDate)
      const [hours, minutes] = selectedTime.split(':')
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes))

      // Check mentor availability
      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('check_time_slot_availability', {
          p_mentor_id: selectedMentor,
          p_date: sessionDateTime.toISOString(),
          p_start_time: selectedTime,
          p_end_time: `${parseInt(hours) + 1}:${minutes}`
        })

      if (availabilityError) throw availabilityError

      if (!isAvailable) {
        toast.error('Selected time slot is not available. Please choose another time.')
        return
      }

      const { error } = await supabase
        .from('sessions')
        .insert({
          title,
          description,
          date: sessionDateTime.toISOString(),
          mentor_id: selectedMentor,
          mentee_id: user.id,
          status: 'upcoming'
        })

      if (error) throw error

      toast.success('Session booked successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setBookingLoading(false)
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
          className="max-w-3xl mx-auto"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Book a Session
            </h1>

            <form onSubmit={handleBooking} className="space-y-6">
              {/* Mentor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Mentor
                </label>
                <select
                  value={selectedMentor}
                  onChange={(e) => setSelectedMentor(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a mentor</option>
                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.full_name} - {mentor.expertise?.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Date
                </label>
                <div className="relative">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    minDate={new Date()}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholderText="Select a date"
                    required
                  />
                  <FaCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`px-4 py-2 rounded-lg text-center transition-colors ${
                        selectedTime === time
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Details */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter session title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe what you'd like to discuss"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? 'Booking...' : 'Book Session'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 