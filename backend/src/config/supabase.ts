import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://somwrfqnshyevpxzpodo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbXdyZnFuc2h5ZXZweHpwb2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTk5MDYsImV4cCI6MjA5MjI3NTkwNn0.QErnOVc5BjO82W9-_hMfTtjJHYETzCRTxZwkxLnzlwA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
