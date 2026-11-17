import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse(401, { error: 'Authentication required.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Required Supabase Edge Function environment variables are missing.');
    return jsonResponse(500, { error: 'Account deletion is not configured.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return jsonResponse(401, { error: 'Invalid authentication.' });

  const payloadSegment = token.split('.')[1];
  let claims: Record<string, unknown>;
  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payloadBytes = Uint8Array.from(atob(paddedBase64), (character) => character.charCodeAt(0));
    claims = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return jsonResponse(401, { error: 'Invalid authentication token.' });
  }

  const authTime = typeof claims.auth_time === 'number' ? claims.auth_time * 1000 : Number.NaN;
  const age = Date.now() - authTime;
  if (claims.sub !== user.id || !Number.isFinite(authTime) || age < -30_000 || age > 5 * 60_000) {
    return jsonResponse(401, { error: 'Please sign in again before deleting your account.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('Supabase failed to delete the authenticated user:', deleteError.message);
    return jsonResponse(500, { error: 'Failed to delete the account.' });
  }

  return jsonResponse(200, { message: 'Account deleted.' });
});
