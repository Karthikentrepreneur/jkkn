'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FaClock, FaCalendar, FaSave, FaChevronLeft, FaChevronRight, FaCalendarWeek, FaTimes, FaCalendarAlt, FaPrint, FaTrash, FaEdit, FaComments, FaStar, FaEnvelope, FaCheck, FaList, FaFileAlt, FaDownload, FaCopy, FaShare, FaTag, FaSearch, FaCheckSquare, FaSquare, FaFileImport, FaFileExport, FaClone, FaHistory, FaChartBar, FaSortUp, FaSortDown } from 'react-icons/fa'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Add type declarations for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface Availability {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface Session {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
}

interface SessionDetails {
  id: string
  title: string
  description: string
  date: string
  mentor_id: string
  mentee: {
    full_name: string
    email: string
  }
}

interface SessionNote {
  id: string
  session_id: string
  content: string
  created_at: string
  created_by: string
}

interface SessionFeedback {
  id: string
  session_id: string
  rating: number
  comment: string
  created_at: string
  created_by: string
}

interface ChecklistItem {
  id: string
  session_id: string
  content: string
  completed: boolean
  created_at: string
}

interface SessionSummary {
  id: string
  session_id: string
  key_points: string[]
  action_items: string[]
  next_steps: string[]
  created_at: string
}

interface ChecklistTemplate {
  id: string
  name: string
  items: string[]
  category: string
  created_at: string
}

interface TemplateVersion {
  id: string
  template_id: string
  version: number
  name: string
  items: string[]
  category: string
  created_at: string
  created_by: string
}

interface TemplateStats {
  template_id: string
  template_name: string
  category: string | null
  total_uses: number
  unique_sessions: number
  average_rating: number
  completion_rate: number
  most_used_day: string
  most_used_time: string
  feedback_count: number
}

interface SharedTemplate {
  id: string
  template_id: string
  template_name: string
  shared_by_name: string
  shared_at: string
  status: string
}

interface TemplateFeedback {
  id: string
  template_id: string
  user_id: string
  rating: number
  comment: string
  created_at: string
}

interface TemplateUsageStats {
  template_id: string
  template_name: string
  category: string
  total_uses: number
  unique_sessions: number
  average_rating: number
  completion_rate: number
  most_used_day: string
  most_used_time: string
  feedback_count: number
}

interface TemplateUsageTrends {
  date: string
  total_templates_used: number
  total_sessions: number
  average_rating: number
  most_used_template: string
  most_used_category: string
}

interface DashboardMetrics {
  totalSessions: number
  upcomingSessions: number
  completedSessions: number
  averageRating: number
  totalTemplates: number
  activeTemplates: number
  totalMentees: number
  sessionCompletionRate: number
}

export default function AvailabilitySettings() {
  const [availability, setAvailability] = useState<Availability[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [view, setView] = useState<'calendar' | 'list' | 'week'>('calendar')
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [cancellingSession, setCancellingSession] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [reschedulingSession, setReschedulingSession] = useState(false)
  const [newSessionDate, setNewSessionDate] = useState<Date | null>(null)
  const [newSessionTime, setNewSessionTime] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState<SessionNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null)
  const [newRating, setNewRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [addingChecklistItem, setAddingChecklistItem] = useState(false)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [newSummary, setNewSummary] = useState({
    key_points: '',
    action_items: '',
    next_steps: ''
  })
  const [submittingSummary, setSubmittingSummary] = useState(false)
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [sharingSummary, setSharingSummary] = useState(false)
  const [templateCategories, setTemplateCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'move' | 'delete' | null>(null)
  const [targetCategory, setTargetCategory] = useState<string>('')
  const [performingBulkAction, setPerformingBulkAction] = useState(false)
  const [importingTemplates, setImportingTemplates] = useState(false)
  const [exportingTemplates, setExportingTemplates] = useState(false)
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<string | null>(null)
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null)
  const [templateVersions, setTemplateVersions] = useState<Record<string, TemplateVersion[]>>({})
  const [templateStats, setTemplateStats] = useState<TemplateStats[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null)
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplate[]>([])
  const [showSharedTemplates, setShowSharedTemplates] = useState(false)
  const [sharingTemplate, setSharingTemplate] = useState<string | null>(null)
  const [shareWithEmail, setShareWithEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [templateFeedback, setTemplateFeedback] = useState<Record<string, TemplateFeedback>>({})
  const [showFeedback, setShowFeedback] = useState<string | null>(null)
  const [newFeedback, setNewFeedback] = useState({ rating: 0, comment: '' })
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [templateTrends, setTemplateTrends] = useState<TemplateUsageTrends[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  })
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    averageRating: 0,
    totalTemplates: 0,
    activeTemplates: 0,
    totalMentees: 0,
    sessionCompletionRate: 0
  })
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ]

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ]

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Check if user is a mentor
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'mentor') {
          router.push('/dashboard')
          return
        }

        // Fetch availability
        const { data: availabilityData, error } = await supabase
          .from('mentor_availability')
          .select('*')
          .eq('mentor_id', user.id)
          .order('day_of_week', { ascending: true })

        if (error) throw error

        if (availabilityData) {
          setAvailability(availabilityData)
        } else {
          // Initialize with default availability
          const defaultAvailability = daysOfWeek.map((_, index) => ({
            id: `temp-${index}`,
            day_of_week: index,
            start_time: '09:00',
            end_time: '17:00',
            is_available: index !== 0 && index !== 6 // Available on weekdays by default
          }))
          setAvailability(defaultAvailability)
        }
      } catch (error) {
        console.error('Error loading availability:', error)
        toast.error('Error loading availability settings')
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [router])

  const handleAvailabilityChange = (dayIndex: number, field: keyof Availability, value: any) => {
    setAvailability(prev => prev.map(day => 
      day.day_of_week === dayIndex ? { ...day, [field]: value } : day
    ))
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete existing availability
      await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_id', user.id)

      // Insert new availability
      const { error } = await supabase
        .from('mentor_availability')
        .insert(
          availability.map(day => ({
            mentor_id: user.id,
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time,
            is_available: day.is_available
          }))
        )

      if (error) throw error

      toast.success('Availability settings saved successfully!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    
    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const isAvailableOnDay = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek)
    return dayAvailability?.is_available || false
  }

  const toggleDayAvailability = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek)
    
    if (dayAvailability) {
      setAvailability(prev => prev.map(day => 
        day.day_of_week === dayOfWeek 
          ? { ...day, is_available: !day.is_available }
          : day
      ))
    }
  }

  const getMonthName = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const getWeekDays = (date: Date) => {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.date)
      return sessionDate.toDateString() === date.toDateString()
    })
  }

  const previousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newDate)
  }

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: sessionsData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('mentor_id', user.id)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })

        if (error) throw error

        if (sessionsData) {
          setSessions(sessionsData)
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
        toast.error('Error loading sessions')
      }
    }

    fetchSessions()
  }, [router])

  const setAllWeekdays = () => {
    setAvailability(prev => prev.map(day => ({
      ...day,
      is_available: day.day_of_week >= 1 && day.day_of_week <= 5
    })))
  }

  const setAllWeekends = () => {
    setAvailability(prev => prev.map(day => ({
      ...day,
      is_available: day.day_of_week === 0 || day.day_of_week === 6
    })))
  }

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select(`
          *,
          mentee:profiles!sessions_mentee_id_fkey(full_name, email)
        `)
        .eq('id', sessionId)
        .single()

      if (error) throw error

      setSelectedSession(session)
      setShowSessionModal(true)
    } catch (error) {
      console.error('Error fetching session details:', error)
      toast.error('Error loading session details')
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const originalContent = document.body.innerHTML
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const styles = `
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif;
          color: #000;
          padding: 20px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .day-cell {
          border: 1px solid #ddd;
          padding: 8px;
          min-height: 100px;
        }
        .session-item {
          background: #f3f4f6;
          padding: 4px;
          margin: 4px 0;
          border-radius: 4px;
          font-size: 12px;
        }
        .available {
          background: #f3e8ff;
        }
        .unavailable {
          background: #fee2e2;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    `

    const printContentHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Availability Calendar - ${new Date().toLocaleDateString()}</title>
          ${styles}
        </head>
        <body>
          <h1>Availability Calendar</h1>
          <div class="calendar-grid">
            ${getWeekDays(currentWeek).map(date => `
              <div class="day-cell ${isAvailableOnDay(date) ? 'available' : 'unavailable'}">
                <div style="font-weight: bold; margin-bottom: 8px;">
                  ${date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                ${getSessionsForDate(date).map(session => `
                  <div class="session-item">
                    <div style="font-weight: bold;">${session.title}</div>
                    <div>${new Date(session.date).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContentHTML)
    printWindow.document.close()
    printWindow.print()
  }

  const cancelSession = async () => {
    if (!selectedSession) return

    setCancellingSession(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', selectedSession.id)

      if (error) throw error

      // Update local sessions state
      setSessions(prev => prev.map(session =>
        session.id === selectedSession.id
          ? { ...session, status: 'cancelled' }
          : session
      ))

      toast.success('Session cancelled successfully')
      setShowSessionModal(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCancellingSession(false)
    }
  }

  const sendRescheduleEmail = async (session: SessionDetails, newDateTime: Date) => {
    setSendingEmail(true)
    try {
      const { error } = await supabase.functions.invoke('send-reschedule-email', {
        body: {
          sessionId: session.id,
          menteeEmail: session.mentee.email,
          oldDateTime: session.date,
          newDateTime: newDateTime.toISOString()
        }
      })

      if (error) throw error
      toast.success('Reschedule notification sent')
    } catch (error: any) {
      console.error('Error sending email:', error)
      toast.error('Failed to send reschedule notification')
    } finally {
      setSendingEmail(false)
    }
  }

  const rescheduleSession = async () => {
    if (!selectedSession || !newSessionDate || !newSessionTime) return

    setReschedulingSession(true)
    try {
      // Combine date and time
      const sessionDateTime = new Date(newSessionDate)
      const [hours, minutes] = newSessionTime.split(':')
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes))

      // Check availability
      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('check_time_slot_availability', {
          p_mentor_id: selectedSession.mentor_id,
          p_date: sessionDateTime.toISOString(),
          p_start_time: newSessionTime,
          p_end_time: `${parseInt(hours) + 1}:${minutes}`
        })

      if (availabilityError) throw availabilityError

      if (!isAvailable) {
        toast.error('Selected time slot is not available')
        return
      }

      // Update session
      const { error } = await supabase
        .from('sessions')
        .update({
          date: sessionDateTime.toISOString(),
          status: 'rescheduled'
        })
        .eq('id', selectedSession.id)

      if (error) throw error

      // Add rescheduling note
      await supabase
        .from('session_notes')
        .insert({
          session_id: selectedSession.id,
          content: `Session rescheduled to ${sessionDateTime.toLocaleString()}`,
          created_by: 'system'
        })

      // Update local state
      setSessions(prev => prev.map(session =>
        session.id === selectedSession.id
          ? { ...session, date: sessionDateTime.toISOString(), status: 'rescheduled' }
          : session
      ))

      // Send email notification
      await sendRescheduleEmail(selectedSession, sessionDateTime)

      toast.success('Session rescheduled successfully')
      setShowSessionModal(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setReschedulingSession(false)
    }
  }

  const fetchSessionNotes = async (sessionId: string) => {
    try {
      const { data: notesData, error } = await supabase
        .from('session_notes')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotes(notesData || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
      toast.error('Error loading session notes')
    }
  }

  const addNote = async () => {
    if (!selectedSession || !newNote.trim()) return

    setAddingNote(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('session_notes')
        .insert({
          session_id: selectedSession.id,
          content: newNote.trim(),
          created_by: user.id
        })

      if (error) throw error

      // Refresh notes
      await fetchSessionNotes(selectedSession.id)
      setNewNote('')
      toast.success('Note added successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAddingNote(false)
    }
  }

  const fetchSessionFeedback = async (sessionId: string) => {
    try {
      const { data: feedbackData, error } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"

      setFeedback(feedbackData)
    } catch (error) {
      console.error('Error fetching feedback:', error)
      toast.error('Error loading session feedback')
    }
  }

  const submitFeedback = async () => {
    if (!selectedSession || newRating === 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('session_feedback')
        .upsert({
          session_id: selectedSession.id,
          rating: newRating,
          comment: feedbackComment.trim(),
          created_by: user.id
        })

      if (error) throw error

      await fetchSessionFeedback(selectedSession.id)
      setNewRating(0)
      setFeedbackComment('')
      toast.success('Feedback submitted successfully')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const fetchChecklist = async (sessionId: string) => {
    try {
      const { data: checklistData, error } = await supabase
        .from('session_checklist')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setChecklist(checklistData || [])
    } catch (error) {
      console.error('Error fetching checklist:', error)
      toast.error('Error loading checklist')
    }
  }

  const addChecklistItem = async () => {
    if (!selectedSession || !newChecklistItem.trim()) return

    setAddingChecklistItem(true)
    try {
      const { error } = await supabase
        .from('session_checklist')
        .insert({
          session_id: selectedSession.id,
          content: newChecklistItem.trim(),
          completed: false
        })

      if (error) throw error

      await fetchChecklist(selectedSession.id)
      setNewChecklistItem('')
      toast.success('Checklist item added')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAddingChecklistItem(false)
    }
  }

  const toggleChecklistItem = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('session_checklist')
        .update({ completed: !completed })
        .eq('id', itemId)

      if (error) throw error

      setChecklist(prev => prev.map(item =>
        item.id === itemId ? { ...item, completed: !completed } : item
      ))
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const fetchSummary = async (sessionId: string) => {
    try {
      const { data: summaryData, error } = await supabase
        .from('session_summaries')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching summary:', error)
      toast.error('Error loading session summary')
    }
  }

  const submitSummary = async () => {
    if (!selectedSession) return

    setSubmittingSummary(true)
    try {
      const { error } = await supabase
        .from('session_summaries')
        .upsert({
          session_id: selectedSession.id,
          key_points: newSummary.key_points.split('\n').filter(Boolean),
          action_items: newSummary.action_items.split('\n').filter(Boolean),
          next_steps: newSummary.next_steps.split('\n').filter(Boolean)
        })

      if (error) throw error

      await fetchSummary(selectedSession.id)
      setNewSummary({ key_points: '', action_items: '', next_steps: '' })
      toast.success('Summary saved successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmittingSummary(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: templatesData, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTemplates(templatesData || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Error loading templates')
    }
  }

  const createTemplate = async () => {
    if (!newTemplateName.trim() || !selectedSession) return

    setCreatingTemplate(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('checklist_templates')
        .insert({
          mentor_id: user.id,
          name: newTemplateName.trim(),
          items: checklist.map(item => item.content),
          category: selectedCategory === 'all' ? null : selectedCategory
        })

      if (error) throw error

      await fetchTemplates()
      setNewTemplateName('')
      toast.success('Template created successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCreatingTemplate(false)
    }
  }

  const applyTemplate = async (template: ChecklistTemplate) => {
    if (!selectedSession) return

    try {
      // Delete existing checklist items
      await supabase
        .from('session_checklist')
        .delete()
        .eq('session_id', selectedSession.id)

      // Add new items from template
      const { error } = await supabase
        .from('session_checklist')
        .insert(
          template.items.map(content => ({
            session_id: selectedSession.id,
            content,
            completed: false
          }))
        )

      if (error) throw error

      await fetchChecklist(selectedSession.id)
      toast.success('Template applied successfully')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const exportSummaryToPDF = async () => {
    if (!selectedSession || !summary) return

    setExportingPDF(true)
    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(20)
      doc.text('Session Summary', 20, 20)
      
      // Add session details
      doc.setFontSize(12)
      doc.text(`Session: ${selectedSession.title}`, 20, 30)
      doc.text(`Date: ${new Date(selectedSession.date).toLocaleDateString()}`, 20, 40)
      doc.text(`Time: ${new Date(selectedSession.date).toLocaleTimeString()}`, 20, 50)
      
      // Add mentee details
      doc.text('Mentee:', 20, 60)
      doc.text(`Name: ${selectedSession.mentee.full_name}`, 30, 70)
      doc.text(`Email: ${selectedSession.mentee.email}`, 30, 80)
      
      // Add key points
      doc.text('Key Points:', 20, 100)
      const keyPointsTable = summary.key_points.map(point => [point])
      doc.autoTable({
        startY: 110,
        head: [['Point']],
        body: keyPointsTable,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] }
      })
      
      // Add action items
      doc.text('Action Items:', 20, doc.lastAutoTable.finalY + 20)
      const actionItemsTable = summary.action_items.map(item => [item])
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 30,
        head: [['Item']],
        body: actionItemsTable,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] }
      })
      
      // Add next steps
      doc.text('Next Steps:', 20, doc.lastAutoTable.finalY + 20)
      const nextStepsTable = summary.next_steps.map(step => [step])
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 30,
        head: [['Step']],
        body: nextStepsTable,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] }
      })
      
      // Save the PDF
      doc.save(`session-summary-${selectedSession.id}.pdf`)
      toast.success('Summary exported successfully')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Error exporting summary')
    } finally {
      setExportingPDF(false)
    }
  }

  const shareSummaryViaEmail = async () => {
    if (!selectedSession || !summary) return

    setSharingSummary(true)
    try {
      const { error } = await supabase.functions.invoke('send-summary-email', {
        body: {
          sessionId: selectedSession.id,
          menteeEmail: selectedSession.mentee.email,
          menteeName: selectedSession.mentee.full_name,
          sessionTitle: selectedSession.title,
          sessionDate: selectedSession.date,
          keyPoints: summary.key_points,
          actionItems: summary.action_items,
          nextSteps: summary.next_steps
        }
      })

      if (error) throw error
      toast.success('Summary shared successfully')
    } catch (error: any) {
      console.error('Error sharing summary:', error)
      toast.error('Failed to share summary')
    } finally {
      setSharingSummary(false)
    }
  }

  const fetchTemplateCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: categories, error } = await supabase
        .from('template_categories')
        .select('name')
        .eq('mentor_id', user.id)
        .order('name')

      if (error) throw error

      setTemplateCategories(categories?.map(c => c.name) || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Error loading template categories')
    }
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return

    setAddingCategory(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('template_categories')
        .insert({
          mentor_id: user.id,
          name: newCategory.trim()
        })

      if (error) throw error

      await fetchTemplateCategories()
      setNewCategory('')
      toast.success('Category added successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAddingCategory(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) {
        newSet.delete(templateId)
      } else {
        newSet.add(templateId)
      }
      return newSet
    })
  }

  const selectAllTemplates = () => {
    const visibleTemplates = templates
      .filter(template => selectedCategory === 'all' || template.category === selectedCategory)
      .filter(template => 
        searchQuery === '' || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    
    if (selectedTemplates.size === visibleTemplates.length) {
      setSelectedTemplates(new Set())
    } else {
      setSelectedTemplates(new Set(visibleTemplates.map(t => t.id)))
    }
  }

  const performBulkAction = async () => {
    if (!bulkAction || selectedTemplates.size === 0) return

    setPerformingBulkAction(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('checklist_templates')
          .delete()
          .in('id', Array.from(selectedTemplates))

        if (error) throw error
        toast.success('Templates deleted successfully')
      } else if (bulkAction === 'move' && targetCategory) {
        const { error } = await supabase
          .from('checklist_templates')
          .update({ category: targetCategory })
          .in('id', Array.from(selectedTemplates))

        if (error) throw error
        toast.success('Templates moved successfully')
      }

      await fetchTemplates()
      setSelectedTemplates(new Set())
      setBulkAction(null)
      setTargetCategory('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setPerformingBulkAction(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    return templates
      .filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.items.some(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory = !selectedCategory || template.category === selectedCategory
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        } else if (sortBy === 'created') {
          return sortOrder === 'asc'
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        } else {
          const aUsage = templateStats.find(s => s.template_id === a.id)?.total_uses || 0
          const bUsage = templateStats.find(s => s.template_id === b.id)?.total_uses || 0
          return sortOrder === 'asc' ? aUsage - bUsage : bUsage - aUsage
        }
      })
  }, [templates, searchQuery, selectedCategory, sortBy, sortOrder, templateStats])

  const exportTemplates = async () => {
    if (selectedTemplates.size === 0) {
      toast.error('Please select templates to export')
      return
    }

    setExportingTemplates(true)
    try {
      const templatesToExport = templates.filter(t => selectedTemplates.has(t.id))
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        templates: templatesToExport
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `templates-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Templates exported successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setExportingTemplates(false)
    }
  }

  const importTemplates = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportingTemplates(true)
    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.version || !importData.templates) {
        throw new Error('Invalid template file format')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Import templates
      const { error } = await supabase
        .from('checklist_templates')
        .insert(
          importData.templates.map((template: ChecklistTemplate) => ({
            mentor_id: user.id,
            name: template.name,
            items: template.items,
            category: template.category
          }))
        )

      if (error) throw error

      await fetchTemplates()
      toast.success('Templates imported successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setImportingTemplates(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const duplicateTemplate = async (templateId: string) => {
    setDuplicatingTemplate(templateId)
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) throw new Error('Template not found')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('checklist_templates')
        .insert({
          mentor_id: user.id,
          name: `${template.name} (Copy)`,
          items: template.items,
          category: template.category
        })

      if (error) throw error

      await fetchTemplates()
      toast.success('Template duplicated successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setDuplicatingTemplate(null)
    }
  }

  const fetchTemplateVersions = async (templateId: string) => {
    setLoadingVersions(true)
    try {
      const { data: versions, error } = await supabase
        .from('template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('version', { ascending: false })

      if (error) throw error

      setTemplateVersions(prev => ({
        ...prev,
        [templateId]: versions || []
      }))
    } catch (error: any) {
      toast.error('Error loading version history')
    } finally {
      setLoadingVersions(false)
    }
  }

  const fetchTemplateStats = async () => {
    setLoadingStats(true)
    try {
      const { data, error } = await supabase
        .rpc('get_template_usage_stats', {
          p_start_date: dateRange.start.toISOString(),
          p_end_date: dateRange.end.toISOString()
        })

      if (error) throw error
      setTemplateStats(data || [])
    } catch (error: any) {
      toast.error('Error loading template statistics')
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchTemplateTrends = async () => {
    setLoadingTrends(true)
    try {
      const { data, error } = await supabase
        .rpc('get_template_usage_trends', {
          p_days: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
        })

      if (error) throw error
      setTemplateTrends(data || [])
    } catch (error: any) {
      toast.error('Error loading template trends')
    } finally {
      setLoadingTrends(false)
    }
  }

  const createTemplateVersion = async (template: ChecklistTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current version number
      const currentVersions = templateVersions[template.id] || []
      const nextVersion = currentVersions.length > 0 ? currentVersions[0].version + 1 : 1

      const { error } = await supabase
        .from('template_versions')
        .insert({
          template_id: template.id,
          version: nextVersion,
          name: template.name,
          items: template.items,
          category: template.category,
          created_by: user.id
        })

      if (error) throw error

      await fetchTemplateVersions(template.id)
      toast.success('Version saved successfully')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const restoreTemplateVersion = async (version: TemplateVersion) => {
    setRestoringVersion(version.id)
    try {
      const { error } = await supabase
        .from('checklist_templates')
        .update({
          name: version.name,
          items: version.items,
          category: version.category
        })
        .eq('id', version.template_id)

      if (error) throw error

      await fetchTemplates()
      await fetchTemplateVersions(version.template_id)
      toast.success('Version restored successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setRestoringVersion(null)
    }
  }

  useEffect(() => {
    if (selectedSession && showNotes) {
      fetchSessionNotes(selectedSession.id)
    }
  }, [selectedSession, showNotes])

  useEffect(() => {
    if (selectedSession) {
      fetchSessionFeedback(selectedSession.id)
      fetchChecklist(selectedSession.id)
      fetchSummary(selectedSession.id)
    }
  }, [selectedSession])

  useEffect(() => {
    if (showTemplates) {
      fetchTemplates()
      fetchTemplateCategories()
    }
  }, [showTemplates])

  useEffect(() => {
    if (showVersionHistory) {
      fetchTemplateVersions(showVersionHistory)
    }
  }, [showVersionHistory])

  useEffect(() => {
    if (showAnalytics) {
      fetchTemplateStats()
      fetchTemplateTrends()
    }
  }, [showAnalytics, dateRange])

  useEffect(() => {
    if (showSharedTemplates) {
      fetchSharedTemplates()
    }
  }, [showSharedTemplates])

  useEffect(() => {
    if (showFeedback) {
      fetchTemplateFeedback(showFeedback)
    }
  }, [showFeedback])

  const fetchSharedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_shared_templates')

      if (error) throw error

      setSharedTemplates(data || [])
    } catch (error: any) {
      toast.error('Error loading shared templates')
    }
  }

  const shareTemplate = async (templateId: string) => {
    if (!shareWithEmail.trim()) return

    setSharing(true)
    try {
      // Get user ID from email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', shareWithEmail.trim())
        .single()

      if (userError) throw new Error('User not found')

      // Share template
      const { error } = await supabase
        .rpc('share_template', {
          p_template_id: templateId,
          p_shared_with: userData.id
        })

      if (error) throw error

      toast.success('Template shared successfully')
      setSharingTemplate(null)
      setShareWithEmail('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSharing(false)
    }
  }

  const acceptSharedTemplate = async (sharedTemplateId: string) => {
    try {
      const { error } = await supabase
        .rpc('accept_shared_template', {
          p_shared_template_id: sharedTemplateId
        })

      if (error) throw error

      await fetchTemplates()
      await fetchSharedTemplates()
      toast.success('Template accepted successfully')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const fetchTemplateFeedback = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_feedback')
        .select('*')
        .eq('template_id', templateId)

      if (error) throw error

      const feedbackMap = (data || []).reduce((acc: Record<string, TemplateFeedback>, feedback: TemplateFeedback) => {
        acc[feedback.user_id] = feedback
        return acc
      }, {})

      setTemplateFeedback(feedbackMap)
    } catch (error: any) {
      toast.error('Error loading template feedback')
    }
  }

  const submitTemplateFeedback = async (templateId: string) => {
    if (newFeedback.rating === 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('template_feedback')
        .upsert({
          template_id: templateId,
          user_id: user.id,
          rating: newFeedback.rating,
          comment: newFeedback.comment.trim()
        })

      if (error) throw error

      await fetchTemplateFeedback(templateId)
      setNewFeedback({ rating: 0, comment: '' })
      toast.success('Feedback submitted successfully')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const exportAnalyticsToPDF = async () => {
    if (!templateStats.length || !templateTrends.length) {
      toast.error('No analytics data to export')
      return
    }

    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(20)
      doc.text('Template Analytics Report', 20, 20)
      
      // Add date range
      doc.setFontSize(12)
      doc.text(`Date Range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 20, 30)
      
      // Add template statistics
      doc.setFontSize(16)
      doc.text('Template Usage Statistics', 20, 45)
      
      let yPos = 55
      templateStats.forEach((stat, index) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(12)
        doc.text(`${stat.template_name}`, 20, yPos)
        yPos += 7
        
        doc.setFontSize(10)
        doc.text(`Category: ${stat.category || 'None'}`, 25, yPos)
        yPos += 7
        doc.text(`Total Uses: ${stat.total_uses}`, 25, yPos)
        yPos += 7
        doc.text(`Unique Sessions: ${stat.unique_sessions}`, 25, yPos)
        yPos += 7
        doc.text(`Average Rating: ${stat.average_rating.toFixed(1)}`, 25, yPos)
        yPos += 7
        doc.text(`Completion Rate: ${(stat.completion_rate * 100).toFixed(1)}%`, 25, yPos)
        yPos += 7
        doc.text(`Most Used: ${stat.most_used_day} ${stat.most_used_time}`, 25, yPos)
        yPos += 7
        doc.text(`Feedback Count: ${stat.feedback_count}`, 25, yPos)
        yPos += 15
      })
      
      // Add usage trends
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Usage Trends', 20, 20)
      
      yPos = 30
      templateTrends.forEach((trend, index) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(12)
        doc.text(new Date(trend.date).toLocaleDateString(), 20, yPos)
        yPos += 7
        
        doc.setFontSize(10)
        doc.text(`Total Templates Used: ${trend.total_templates_used}`, 25, yPos)
        yPos += 7
        doc.text(`Total Sessions: ${trend.total_sessions}`, 25, yPos)
        yPos += 7
        doc.text(`Average Rating: ${trend.average_rating.toFixed(1)}`, 25, yPos)
        yPos += 7
        doc.text(`Most Used Template: ${trend.most_used_template}`, 25, yPos)
        yPos += 7
        doc.text(`Most Used Category: ${trend.most_used_category}`, 25, yPos)
        yPos += 15
      })
      
      // Save the PDF
      doc.save(`template-analytics-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Analytics exported to PDF successfully')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Error exporting analytics to PDF')
    }
  }

  const exportAnalyticsToCSV = () => {
    if (!templateStats.length || !templateTrends.length) {
      toast.error('No analytics data to export')
      return
    }

    try {
      // Create CSV content for template statistics
      const statsHeaders = [
        'Template Name',
        'Category',
        'Total Uses',
        'Unique Sessions',
        'Average Rating',
        'Completion Rate',
        'Most Used Day',
        'Most Used Time',
        'Feedback Count'
      ]
      
      const statsRows = templateStats.map((stat: TemplateStats) => [
        stat.template_name,
        stat.category || '',
        stat.total_uses,
        stat.unique_sessions,
        stat.average_rating.toFixed(1),
        (stat.completion_rate * 100).toFixed(1) + '%',
        stat.most_used_day,
        stat.most_used_time,
        stat.feedback_count
      ])
      
      // Create CSV content for usage trends
      const trendsHeaders = [
        'Date',
        'Total Templates Used',
        'Total Sessions',
        'Average Rating',
        'Most Used Template',
        'Most Used Category'
      ]
      
      const trendsRows = templateTrends.map((trend: TemplateUsageTrends) => [
        new Date(trend.date).toLocaleDateString(),
        trend.total_templates_used,
        trend.total_sessions,
        trend.average_rating.toFixed(1),
        trend.most_used_template,
        trend.most_used_category
      ])
      
      // Combine all data
      const csvContent = [
        'Template Usage Statistics',
        statsHeaders.join(','),
        ...statsRows.map(row => row.join(',')),
        '\nUsage Trends',
        trendsHeaders.join(','),
        ...trendsRows.map(row => row.join(','))
      ].join('\n')
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `template-analytics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Analytics exported to CSV successfully')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Error exporting analytics to CSV')
    }
  }

  const fetchDashboardMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch total sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, status, date')
        .eq('mentor_id', user.id)

      if (sessionsError) throw sessionsError

      // Fetch session feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('session_feedback')
        .select('rating')
        .eq('mentor_id', user.id)

      if (feedbackError) throw feedbackError

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('checklist_templates')
        .select('id, items')
        .eq('mentor_id', user.id)

      if (templatesError) throw templatesError

      // Fetch unique mentees
      const { data: menteesData, error: menteesError } = await supabase
        .from('sessions')
        .select('mentee_id')
        .eq('mentor_id', user.id)

      if (menteesError) throw menteesError

      const now = new Date()
      const upcomingSessions = sessionsData?.filter(s => new Date(s.date) > now) || []
      const completedSessions = sessionsData?.filter(s => s.status === 'completed') || []
      const averageRating = feedbackData?.reduce((acc, curr) => acc + curr.rating, 0) / (feedbackData?.length || 1)
      const activeTemplates = templatesData?.filter(t => t.items.length > 0) || []
      const uniqueMentees = new Set(menteesData?.map(m => m.mentee_id)).size

      setDashboardMetrics({
        totalSessions: sessionsData?.length || 0,
        upcomingSessions: upcomingSessions.length,
        completedSessions: completedSessions.length,
        averageRating: Number(averageRating.toFixed(1)),
        totalTemplates: templatesData?.length || 0,
        activeTemplates: activeTemplates.length,
        totalMentees: uniqueMentees,
        sessionCompletionRate: (completedSessions.length / (sessionsData?.length || 1)) * 100
      })
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      toast.error('Error loading dashboard metrics')
    } finally {
      setLoadingMetrics(false)
    }
  }

  useEffect(() => {
    if (showDashboard) {
      fetchDashboardMetrics()
    }
  }, [showDashboard])

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
          className="max-w-4xl mx-auto"
        >
          {/* Dashboard Overview */}
          {showDashboard && (
            <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Dashboard Overview
                </h2>
                <button
                  onClick={() => setShowDashboard(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              {loadingMetrics ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sessions Overview */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Sessions</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total</span>
                        <span className="text-white font-medium">{dashboardMetrics.totalSessions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Upcoming</span>
                        <span className="text-white font-medium">{dashboardMetrics.upcomingSessions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Completed</span>
                        <span className="text-white font-medium">{dashboardMetrics.completedSessions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Templates Overview */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Templates</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total</span>
                        <span className="text-white font-medium">{dashboardMetrics.totalTemplates}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Active</span>
                        <span className="text-white font-medium">{dashboardMetrics.activeTemplates}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Categories</span>
                        <span className="text-white font-medium">{templateCategories.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Performance</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Avg Rating</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-white font-medium">{dashboardMetrics.averageRating}</span>
                          <FaStar className="text-yellow-400 w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Completion Rate</span>
                        <span className="text-white font-medium">{dashboardMetrics.sessionCompletionRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Mentees</span>
                        <span className="text-white font-medium">{dashboardMetrics.totalMentees}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setView('calendar')}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                      >
                        <FaCalendar />
                        <span>View Calendar</span>
                      </button>
                      <button
                        onClick={() => setShowTemplates(true)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                      >
                        <FaList />
                        <span>Manage Templates</span>
                      </button>
                      <button
                        onClick={() => setShowAnalytics(true)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600/20 border border-green-500/50 text-green-400 rounded hover:bg-green-600/30 transition-colors"
                      >
                        <FaChartBar />
                        <span>View Analytics</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Availability Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Availability Settings
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setView('list')}
                    className={`px-4 py-2 rounded-lg ${
                      view === 'list'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    List View
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className={`px-4 py-2 rounded-lg ${
                      view === 'calendar'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`px-4 py-2 rounded-lg ${
                      view === 'week'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <FaCalendarWeek />
                  </button>
                </div>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <FaPrint />
                  <span>Print</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaSave />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

            <div className="mb-6 flex space-x-4">
              <button
                onClick={setAllWeekdays}
                className="px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-lg hover:bg-purple-600/30 transition-colors"
              >
                Set All Weekdays
              </button>
              <button
                onClick={setAllWeekends}
                className="px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-lg hover:bg-purple-600/30 transition-colors"
              >
                Set All Weekends
              </button>
            </div>

            {view === 'week' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={previousWeek}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FaChevronLeft />
                  </button>
                  <h2 className="text-xl font-semibold">
                    Week of {currentWeek.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                  </h2>
                  <button
                    onClick={nextWeek}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FaChevronRight />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {getWeekDays(currentWeek).map((date) => (
                    <div
                      key={date.toISOString()}
                      className="space-y-2"
                    >
                      <div
                        onClick={() => toggleDayAvailability(date)}
                        className={`p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          isAvailableOnDay(date)
                            ? 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {date.toLocaleDateString('default', { weekday: 'short' })}
                          </div>
                          <div className="text-lg font-bold">
                            {date.getDate()}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {getSessionsForDate(date).map((session) => (
                          <div
                            key={session.id}
                            onClick={() => fetchSessionDetails(session.id)}
                            className="p-2 bg-pink-600/20 border border-pink-500/50 rounded-lg text-xs cursor-pointer hover:bg-pink-600/30 transition-colors"
                          >
                            <div className="font-medium truncate">{session.title}</div>
                            <div className="text-pink-300">
                              {new Date(session.date).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : view === 'calendar' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FaChevronLeft />
                  </button>
                  <h2 className="text-xl font-semibold">{getMonthName(currentMonth)}</h2>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FaChevronRight />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center font-medium text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                  {getDaysInMonth(currentMonth).map((date, index) => (
                    <div
                      key={index}
                      onClick={() => date && toggleDayAvailability(date)}
                      className={`aspect-square p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        date
                          ? isAvailableOnDay(date)
                            ? 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                          : 'bg-transparent'
                      }`}
                    >
                      {date && (
                        <div className="h-full flex flex-col">
                          <span className="text-sm">{date.getDate()}</span>
                          {isAvailableOnDay(date) && (
                            <div className="text-xs text-purple-300 mt-1">
                              Available
                            </div>
                          )}
                          {getSessionsForDate(date).length > 0 && (
                            <div className="text-xs text-pink-300 mt-1">
                              {getSessionsForDate(date).length} session{getSessionsForDate(date).length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-400 text-center">
                  Click on a day to toggle its availability
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {availability.map((day) => (
                  <div
                    key={day.day_of_week}
                    className="bg-gray-700/50 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">{daysOfWeek[day.day_of_week]}</h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.is_available}
                          onChange={(e) => handleAvailabilityChange(day.day_of_week, 'is_available', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {day.is_available && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Start Time
                          </label>
                          <select
                            value={day.start_time}
                            onChange={(e) => handleAvailabilityChange(day.day_of_week, 'start_time', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {timeSlots.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            End Time
                          </label>
                          <select
                            value={day.end_time}
                            onChange={(e) => handleAvailabilityChange(day.day_of_week, 'end_time', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {timeSlots.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div ref={printRef} className="no-print">
              {/* ... existing view content ... */}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSessionModal && selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{selectedSession.title}</h3>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <FaCalendarAlt />
                  <span>
                    {new Date(selectedSession.date).toLocaleDateString('default', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-gray-300">
                  <FaClock />
                  <span>
                    {new Date(selectedSession.date).toLocaleTimeString('default', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Mentee Details</h4>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="font-medium">{selectedSession.mentee.full_name}</div>
                    <div className="text-sm text-gray-400">{selectedSession.mentee.email}</div>
                  </div>
                </div>

                {selectedSession.description && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
                    <p className="text-gray-300">{selectedSession.description}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4 space-y-4">
                {/* Rescheduling Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-400">Reschedule Session</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">New Date</label>
                      <DatePicker
                        selected={newSessionDate}
                        onChange={(date) => setNewSessionDate(date)}
                        minDate={new Date()}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">New Time</label>
                      <select
                        value={newSessionTime}
                        onChange={(e) => setNewSessionTime(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white"
                      >
                        <option value="">Select time</option>
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={rescheduleSession}
                    disabled={reschedulingSession || !newSessionDate || !newSessionTime}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaEdit />
                    <span>{reschedulingSession ? 'Rescheduling...' : 'Reschedule Session'}</span>
                  </button>
                </div>

                {/* Feedback Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-400">Session Feedback</h4>
                  {feedback ? (
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={`w-5 h-5 ${
                              star <= feedback.rating
                                ? 'text-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      {feedback.comment && (
                        <p className="text-sm text-gray-300 mt-2">{feedback.comment}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewRating(star)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                              star <= newRating
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-gray-600 hover:text-gray-500'
                            }`}
                          >
                            <FaStar className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Add your feedback (optional)..."
                        className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                        rows={3}
                      />
                      <button
                        onClick={submitFeedback}
                        disabled={newRating === 0}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600/20 border border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaStar />
                        <span>{newRating === 0 ? 'Submit Feedback' : 'Submit Feedback'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-400">Session Notes</h4>
                    <button
                      onClick={() => setShowNotes(!showNotes)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <FaComments />
                    </button>
                  </div>
                  {showNotes && (
                    <div className="space-y-4">
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3 bg-gray-700/50 rounded-lg text-sm"
                          >
                            <div className="text-gray-400 text-xs mb-1">
                              {new Date(note.created_at).toLocaleString()}
                            </div>
                            <div className="text-white">{note.content}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note..."
                          className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                        />
                        <button
                          onClick={addNote}
                          disabled={addingNote || !newNote.trim()}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingNote ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checklist Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-400">Preparation Checklist</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <FaCopy />
                      </button>
                      <FaList className="text-gray-400" />
                    </div>
                  </div>

                  {showTemplates && (
                    <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                      {/* Category Management */}
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="New category..."
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                          />
                          <button
                            onClick={addCategory}
                            disabled={addingCategory || !newCategory.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingCategory ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${
                              selectedCategory === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            All
                          </button>
                          {templateCategories.map((category) => (
                            <button
                              key={category}
                              onClick={() => setSelectedCategory(category)}
                              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                selectedCategory === category
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search and Bulk Actions */}
                      <div className="mb-4 space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search templates..."
                              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                            />
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          </div>
                          <button
                            onClick={selectAllTemplates}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Select all visible templates"
                          >
                            {selectedTemplates.size === filteredTemplates.length ? <FaCheckSquare /> : <FaSquare />}
                          </button>
                        </div>

                        {selectedTemplates.size > 0 && (
                          <div className="flex items-center space-x-2">
                            <select
                              value={bulkAction || ''}
                              onChange={(e) => setBulkAction(e.target.value as 'move' | 'delete' | null)}
                              className="px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white"
                            >
                              <option value="">Select action...</option>
                              <option value="move">Move to category</option>
                              <option value="delete">Delete</option>
                            </select>

                            {bulkAction === 'move' && (
                              <select
                                value={targetCategory}
                                onChange={(e) => setTargetCategory(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white"
                              >
                                <option value="">Select category...</option>
                                {templateCategories.map((category) => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            )}

                            <button
                              onClick={performBulkAction}
                              disabled={performingBulkAction || !bulkAction || (bulkAction === 'move' && !targetCategory)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {performingBulkAction ? 'Processing...' : 'Apply'}
                            </button>

                            <button
                              onClick={() => {
                                setSelectedTemplates(new Set())
                                setBulkAction(null)
                                setTargetCategory('')
                              }}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Template Creation */}
                      <div className="flex items-center space-x-2 mb-4">
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="Template name..."
                          className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                        />
                        <button
                          onClick={createTemplate}
                          disabled={creatingTemplate || !newTemplateName.trim()}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingTemplate ? 'Creating...' : 'Save Template'}
                        </button>
                      </div>

                      {/* Template List */}
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {filteredTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleTemplateSelect(template.id)}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {selectedTemplates.has(template.id) ? <FaCheckSquare /> : <FaSquare />}
                              </button>
                              <span className="text-sm text-white">{template.name}</span>
                              {template.category && (
                                <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded-full">
                                  {template.category}
                                </span>
                              )}
                              {templateStats.find(s => s.template_id === template.id) && (
                                <div className="flex items-center space-x-2 text-xs text-gray-400">
                                  <span title="Total uses">
                                    <FaChartBar className="inline mr-1" />
                                    {templateStats.find(s => s.template_id === template.id)?.total_uses}
                                  </span>
                                  <span title="Average rating">
                                    <FaStar className="inline mr-1" />
                                    {templateStats.find(s => s.template_id === template.id)?.average_rating.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setShowVersionHistory(template.id)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Version history"
                              >
                                <FaHistory />
                              </button>
                              <button
                                onClick={() => duplicateTemplate(template.id)}
                                disabled={duplicatingTemplate === template.id}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Duplicate template"
                              >
                                <FaClone />
                              </button>
                              <button
                                onClick={() => applyTemplate(template)}
                                className="px-3 py-1 text-sm bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded-lg"
                      >
                        <button
                          onClick={() => toggleChecklistItem(item.id, item.completed)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {item.completed && <FaCheck className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {item.content}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item..."
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                    />
                    <button
                      onClick={addChecklistItem}
                      disabled={addingChecklistItem || !newChecklistItem.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingChecklistItem ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-400">Session Summary</h4>
                    <div className="flex items-center space-x-2">
                      {summary && (
                        <>
                          <button
                            onClick={shareSummaryViaEmail}
                            disabled={sharingSummary}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Share with mentee"
                          >
                            <FaShare />
                          </button>
                          <button
                            onClick={exportSummaryToPDF}
                            disabled={exportingPDF}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Export as PDF"
                          >
                            <FaDownload />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowSummary(!showSummary)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <FaFileAlt />
                      </button>
                    </div>
                  </div>

                  {showSummary && (
                    <div className="space-y-4">
                      {summary ? (
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-400 mb-2">Key Points</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {summary.key_points.map((point, index) => (
                                <li key={index} className="text-sm text-gray-300">{point}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-400 mb-2">Action Items</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {summary.action_items.map((item, index) => (
                                <li key={index} className="text-sm text-gray-300">{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-400 mb-2">Next Steps</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {summary.next_steps.map((step, index) => (
                                <li key={index} className="text-sm text-gray-300">{step}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Key Points</label>
                            <textarea
                              value={newSummary.key_points}
                              onChange={(e) => setNewSummary(prev => ({ ...prev, key_points: e.target.value }))}
                              placeholder="Enter key points (one per line)..."
                              className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Action Items</label>
                            <textarea
                              value={newSummary.action_items}
                              onChange={(e) => setNewSummary(prev => ({ ...prev, action_items: e.target.value }))}
                              placeholder="Enter action items (one per line)..."
                              className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Next Steps</label>
                            <textarea
                              value={newSummary.next_steps}
                              onChange={(e) => setNewSummary(prev => ({ ...prev, next_steps: e.target.value }))}
                              placeholder="Enter next steps (one per line)..."
                              className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                              rows={3}
                            />
                          </div>
                          <button
                            onClick={submitSummary}
                            disabled={submittingSummary}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaFileAlt />
                            <span>{submittingSummary ? 'Saving...' : 'Save Summary'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cancel Button */}
                <button
                  onClick={cancelSession}
                  disabled={cancellingSession}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaTrash />
                  <span>{cancellingSession ? 'Cancelling...' : 'Cancel Session'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <AnimatePresence>
        {showVersionHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Version History</h3>
                <button
                  onClick={() => setShowVersionHistory(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              {loadingVersions ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {templateVersions[showVersionHistory]?.map((version) => (
                    <div
                      key={version.id}
                      className="p-4 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-white">Version {version.version}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => restoreTemplateVersion(version)}
                          disabled={restoringVersion === version.id}
                          className="px-3 py-1 text-sm bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restoringVersion === version.id ? 'Restoring...' : 'Restore'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-400">Name:</span> {version.name}
                        </div>
                        {version.category && (
                          <div className="text-sm text-gray-300">
                            <span className="text-gray-400">Category:</span> {version.category}
                          </div>
                        )}
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-400">Items:</span>
                          <ul className="list-disc list-inside mt-1">
                            {version.items.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Template Management
              </h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="w-full md:w-48">
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Categories</option>
                    {templateCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Options */}
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'usage')}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="created">Sort by Created</option>
                    <option value="usage">Sort by Usage</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white hover:bg-gray-600/50 transition-colors"
                  >
                    {sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />}
                  </button>
                </div>
              </div>

              {/* Active Filters */}
              {(searchQuery || selectedCategory) && (
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1">
                      <span className="text-sm text-gray-300">Search: {searchQuery}</span>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-white"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                  {selectedCategory && (
                    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1">
                      <span className="text-sm text-gray-300">Category: {selectedCategory}</span>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Template List */}
            <div className="space-y-4">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No templates found matching your criteria
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTemplateSelect(template.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {selectedTemplates.has(template.id) ? <FaCheckSquare /> : <FaSquare />}
                      </button>
                      <span className="text-sm text-white">{template.name}</span>
                      {template.category && (
                        <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded-full">
                          {template.category}
                        </span>
                      )}
                      {templateStats.find(s => s.template_id === template.id) && (
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span title="Total uses">
                            <FaChartBar className="inline mr-1" />
                            {templateStats.find(s => s.template_id === template.id)?.total_uses}
                          </span>
                          <span title="Average rating">
                            <FaStar className="inline mr-1" />
                            {templateStats.find(s => s.template_id === template.id)?.average_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowVersionHistory(template.id)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Version history"
                      >
                        <FaHistory />
                      </button>
                      <button
                        onClick={() => duplicateTemplate(template.id)}
                        disabled={duplicatingTemplate === template.id}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Duplicate template"
                      >
                        <FaClone />
                      </button>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1 text-sm bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Share Template Modal */}
      <AnimatePresence>
        {sharingTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Share Template</h3>
                <button
                  onClick={() => setSharingTemplate(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Share with (email)
                  </label>
                  <input
                    type="email"
                    value={shareWithEmail}
                    onChange={(e) => setShareWithEmail(e.target.value)}
                    placeholder="Enter email address..."
                    className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={() => shareTemplate(sharingTemplate)}
                  disabled={sharing || !shareWithEmail.trim()}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaShare />
                  <span>{sharing ? 'Sharing...' : 'Share Template'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 