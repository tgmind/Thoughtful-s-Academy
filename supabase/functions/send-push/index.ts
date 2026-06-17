// ============================================================================
// send-push — Supabase Edge Function
//
// Triggered by Database Webhooks on INSERT into `notifications` and `messages`.
// Resolves the recipients, looks up their Web Push subscriptions and delivers a
// push so they get an alert even when the app/PWA is closed.
//
// Required secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY    — VAPID public key
//   VAPID_PRIVATE_KEY   — VAPID private key
//   VAPID_SUBJECT       — e.g. mailto:you@example.com
//   WEBHOOK_SECRET      — shared secret; the webhook must send it as a header
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || ''

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

const TYPE_EMOJI: Record<string, string> = {
  fee: '💰', live_class: '🔴', announcement: '📢', homework: '📝', general: '📌',
}

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
}

async function recipientsForNotification(rec: any): Promise<string[]> {
  const now = Date.now()
  if (rec.is_active === false) return []
  if (rec.scheduled_at && new Date(rec.scheduled_at).getTime() > now) return []
  if (rec.expires_at && new Date(rec.expires_at).getTime() < now) return []

  const role = rec.target_role
  let ids: string[] = []

  if (role === 'teacher' || role === 'all') {
    const { data } = await admin.from('profiles').select('id').eq('role', 'teacher').eq('is_active', true)
    ids.push(...(data ?? []).map((r: any) => r.id))
  }
  if (role === 'student' || role === 'all') {
    if (rec.target_batch_id) {
      const { data } = await admin.from('student_profiles').select('id').eq('batch_id', rec.target_batch_id)
      ids.push(...(data ?? []).map((r: any) => r.id))
    } else {
      const { data } = await admin.from('profiles').select('id').eq('role', 'student').eq('is_active', true)
      ids.push(...(data ?? []).map((r: any) => r.id))
    }
  }
  if (rec.created_by) ids = ids.filter((id) => id !== rec.created_by)
  return [...new Set(ids)]
}

async function sendToUsers(userIds: string[], payload: Record<string, unknown>) {
  if (userIds.length === 0) return 0
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  let sent = 0
  await Promise.all((subs ?? []).map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
      sent++
    } catch (err: any) {
      const code = err?.statusCode
      // 404/410 → the subscription is dead; clean it up.
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      } else {
        console.error('push send error', code, err?.body || err?.message)
      }
    }
  }))
  return sent
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok({ ok: true })

  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { return ok({ ok: true }) }

  const table = body?.table
  const rec = body?.record
  if (!rec) return ok({ ok: true })

  let userIds: string[] = []
  let payload: Record<string, unknown> | null = null

  if (table === 'notifications') {
    userIds = await recipientsForNotification(rec)
    const emoji = TYPE_EMOJI[rec.type] || '📌'
    payload = {
      title: `${emoji} ${rec.title || 'New notification'}`,
      body: rec.body || '',
      tag: `notif-${rec.id}`,
      url: '/',
    }
  } else if (table === 'messages') {
    if (!rec.receiver_id) return ok({ ok: true })
    userIds = [rec.receiver_id]
    const [{ data: sender }, { data: receiver }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', rec.sender_id).maybeSingle(),
      admin.from('profiles').select('role').eq('id', rec.receiver_id).maybeSingle(),
    ])
    payload = {
      title: `💬 ${sender?.full_name || 'New message'}`,
      body: rec.content || '',
      tag: `msg-${rec.sender_id}`,
      url: receiver?.role ? `/${receiver.role}/messages` : '/',
    }
  } else {
    return ok({ ok: true })
  }

  const sent = await sendToUsers(userIds, payload!)
  return ok({ ok: true, recipients: userIds.length, sent })
})
