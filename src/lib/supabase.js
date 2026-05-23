import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ekjtxomxdexychwblmrp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVranR4b214ZGV4eWNod2JsbXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjE4MTMsImV4cCI6MjA5NDc5NzgxM30.LpzjxMnvsPR823pCEomxJbCJO_sApUSdhuSSfGgLP1A'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)