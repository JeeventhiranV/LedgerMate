// @ts-nocheck — Deno URL imports are not resolvable by VS Code's Node TS checker
/**
 * Supabase Edge Function: send-push
 * Sends a Web Push notification to a specific user's subscribed devices.
 *
 * Secrets required (Dashboard → Project Settings → Edge Functions → Secrets):
 *   VAPID_PRIVATE_KEY   your generated private key
 *   VAPID_PUBLIC_KEY    your generated public key
 *   VAPID_SUBJECT       mailto:kishorkumarr@uncia.ai
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.
 *
 * DB migration (SQL Editor, run once):
 *   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush          from 'https://esm.sh/web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req: Request) => {
  /* Pre-flight */
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    /* ── Auth: verify the caller's JWT ── */
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase   = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    /* ── Parse request body ── */
    const { userId, title, body, url, tag } = await req.json() as {
      userId: string;
      title : string;
      body  : string;
      url   : string;
      tag   : string;
    };

    /* Users can only push to themselves */
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });
    }

    /* ── Load push subscription from DB ── */
    const { data: profile, error: dbErr } = await supabase
      .from('user_profiles')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (dbErr || !profile?.push_subscription) {
      return new Response(
        JSON.stringify({ error: 'No push subscription found for this user' }),
        { status: 404, headers: CORS }
      );
    }

    /* ── Configure VAPID ── */
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    );

    /* ── Send the push ── */
    const payload = JSON.stringify({
      title: title || 'LedgerMate',
      body : body  || '',
      icon : '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag  : tag   || 'lm-notif',
      url  : url   || '/',
    });

    await webpush.sendNotification(
      profile.push_subscription as webpush.PushSubscription,
      payload
    );

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-push]', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});
