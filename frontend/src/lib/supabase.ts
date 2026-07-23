import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elpcagrpcvbdugsjqpcl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGNhZ3JwY3ZiZHVnc2pxcGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDUwMDIsImV4cCI6MjEwMDM4MTAwMn0.6wNiKHVSnC63-ESepJs9uIR9iJL6I8gkgT6PUzb7hdE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
