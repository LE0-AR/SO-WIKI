import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zkuhkwzqvrfpbfcgifpl.supabase.co'
const supabaseKey = 'sb_publishable_hcVe7Wv3Mia-21g9i8oweg_cTtZDj8l'

export const supabase = createClient(supabaseUrl, supabaseKey)