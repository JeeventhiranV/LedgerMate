// ─── Supabase Client Config ────────────────────────────────────────────────────
// Replace both values below with yours:
//   Dashboard → Settings → API → Project URL & anon/public key
// ──────────────────────────────────────────────────────────────────────────────

var SUPABASE_URL  = 'https://tjpxkzpqauffyzcpfvyi.supabase.co';
var SUPABASE_ANON = 'YOUR_ACTUAL_ANON_KEY';

var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession   : true,
    autoRefreshToken : true,
    detectSessionInUrl: true   // needed for OAuth + magic-link callbacks
  }
});
