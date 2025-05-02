import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gzoykxpiclbuprgoigwl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b3lreHBpY2xidXByZ29pZ3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMDY4NTQsImV4cCI6MjA2MTc4Mjg1NH0.HBxzk4AMBH15PZi7X2sdPsAerWiU7cLGz5nWD9MKI-w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 