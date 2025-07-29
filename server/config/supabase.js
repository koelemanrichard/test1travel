const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://kmnjdmaqbicpbtijqzks.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbmpkbWFxYmljcGJ0aWpxemtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NzkyNTMsImV4cCI6MjA2MTE1NTI1M30.SF0u0KB8J4hzmiy4urXsDKTboGlLtyowmT3Kgy6vmBE';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('<PROJECT-ID>')) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;
