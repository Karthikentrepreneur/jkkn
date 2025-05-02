'use client'

import ClientLayout from './ClientLayout'
 
export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>
} 