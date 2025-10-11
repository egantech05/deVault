import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yfiiboimwvjgqtsfaxme.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaWlib2ltd3ZqZ3F0c2ZheG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzQ5NjksImV4cCI6MjA3MzQxMDk2OX0.a2rlSoREcP4R8nwQopQb5vraOmYkaWPX3l2PpwepLhY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
