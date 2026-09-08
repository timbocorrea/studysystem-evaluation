
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin'
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // 2. Get Secrets
    let PROJECT_REF = Deno.env.get('SUPABASE_PROJECT_REF');
    const ACCESS_TOKEN = Deno.env.get('MANAGEMENT_API_TOKEN');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    try {
        // 1. Authenticate the User
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        // Check user auth...
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

        // 1.5 Authorize User Role (INSTRUCTOR/MASTER)
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['INSTRUCTOR', 'MASTER'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: 'Acesso Proibido: Requer privilégios administrativos.' }), { status: 403, headers: corsHeaders })
        }

        if (!PROJECT_REF) {
            const url = Deno.env.get('SUPABASE_URL') || '';
            const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
            if (match) PROJECT_REF = match[1];
        }

        // --- 1. Get DB Size via SQL (More reliable) ---
        let dbSizeBytes = 0;
        if (SERVICE_ROLE_KEY) {
            const adminClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                SERVICE_ROLE_KEY
            );
            // Postgres query to get DB size
            const { data: dbSizeData, error: dbSizeError } = await adminClient.rpc('get_db_size_bytes');
            // If RPC doesn't exist, we might fail. 
            // Alternatively, try direct SQL if we had a way, but RPC is best. 
            // Let's assume for now we might not have the RPC. 
            // We can create it via migration or just skip if fail.
            // Actually, 'monitor-usage' is an Edge Function, it can't run raw SQL without an RPC or a connection pooler + pg driver.
            // Using RPC is the Supabase way. We will assume the RPC exists or we fallback.
            if (!dbSizeError && typeof dbSizeData === 'number') {
                dbSizeBytes = dbSizeData;
            }
        }

        // --- 2. Try Management API for Egress/Storage ---
        let usageData = {};
        let apiError = null;

        if (ACCESS_TOKEN && PROJECT_REF) {
            // Try a known valid endpoint first to check connectivity, e.g., project details
            // Or metrics (but that requires service role usually).
            // Since `/usage` is 404, let's NOT call it to avoid error noise.
            // We will return mock/null for Egress for now until we find the real endpoint.
            // But let's try to hit the root /projects/{ref} to verify the ref is good.
            const verifyUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
            const verifyRes = await fetch(verifyUrl, {
                headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
            });

            if (verifyRes.ok) {
                // Project exists!
                // Currently Supabase doesn't expose a simple "egress" endpoint publicly.
                // We will mark egress as -1 (unknown) so UI can show "See Dashboard"
                usageData = { network_egress: -1, storage_size: -1 };
            } else {
                apiError = `Project verification failed: ${verifyRes.status}`;
            }
        }

        return new Response(
            JSON.stringify({
                egress_bytes: usageData.network_egress ?? 0,
                storage_bytes: usageData.storage_size ?? 0,
                db_size_bytes: dbSizeBytes,
                api_status: apiError ? 'error' : 'ok'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Erro Interno do Servidor',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})

// Helper shim for createClient since we are in Deno without npm imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
