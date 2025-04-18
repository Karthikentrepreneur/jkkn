export type UserRole = 'admin' | 'mentor' | 'mentee' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Mentor {
  id: string;
  user_id: string;
  staff_id: string;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  roll_no: string;
  program: string;
  semester: number;
  mentor_id: string;
  created_at: string;
}

export interface Counselling {
  id: string;
  mentor_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface CounsellingStudent {
  id: string;
  counselling_id: string;
  student_id: string;
  status: 'attended' | 'absent';
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  service_limit: number;
  sla_days: number;
  is_active: boolean;
  applicable_to: 'staff' | 'student' | 'both';
  payment_method: 'pre' | 'post' | 'none';
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  service_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  current_approval_level: number;
  created_at: string;
}

export interface ApprovalLevel {
  id: string;
  service_id: string;
  level: number;
  approver_id: string;
  created_at: string;
}

export interface ApprovalHistory {
  id: string;
  request_id: string;
  level: number;
  approver_id: string;
  status: 'approved' | 'rejected';
  comments: string;
  created_at: string;
} 