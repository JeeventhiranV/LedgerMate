// ─── Supabase Client Config ────────────────────────────────────────────────────
// Replace both values below with yours:
//   Dashboard → Settings → API → Project URL & anon/public key
// ──────────────────────────────────────────────────────────────────────────────

var SUPABASE_URL1  = 'SUPABASE_URL';
var SUPABASE_ANON1 = 'SUPABASE_ANON';

var _supabase = supabase.createClient(SUPABASE_URL1, SUPABASE_ANON1, {
  auth: {
    persistSession   : true,
    autoRefreshToken : true,
    detectSessionInUrl: true   // needed for OAuth + magic-link callbacks
  }
});
