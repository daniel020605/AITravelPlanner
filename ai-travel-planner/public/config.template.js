// Runtime configuration template. Populated at container start via envsubst.
window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
window.__APP_CONFIG__.SUPABASE_URL = '$SUPABASE_URL';
window.__APP_CONFIG__.SUPABASE_ANON_KEY = '$SUPABASE_ANON_KEY';
window.__APP_CONFIG__.SUPABASE_SERVICE_ROLE_KEY = '$SUPABASE_SERVICE_ROLE_KEY';
