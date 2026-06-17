import { supabase } from '../lib/supabase'

// The VAPID *public* key is safe to ship to the browser. The private key lives
// only in the Supabase Edge Function secrets. If this is unset, push is simply
// disabled and the app behaves exactly as before.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export function pushConfigured() {
  return !!VAPID_PUBLIC_KEY
}

// 'granted' | 'denied' | 'default' | 'unsupported'
export function pushPermission() {
  return pushSupported() ? Notification.permission : 'unsupported'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function saveSubscription(userId, sub) {
  const json = sub.toJSON()
  try {
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' })
  } catch (e) {
    console.warn('Could not save push subscription:', e?.message || e)
  }
}

async function getOrCreateSubscription() {
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  return sub
}

// Call this from a user gesture (button click). Requests permission if needed,
// subscribes, and stores the subscription. Returns the resulting permission
// state: 'granted' | 'denied' | 'default' | 'unsupported' | 'error'.
export async function enablePush(userId) {
  if (!pushSupported() || !pushConfigured() || !userId) return 'unsupported'
  let permission = Notification.permission
  if (permission === 'default') permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission
  try {
    const sub = await getOrCreateSubscription()
    await saveSubscription(userId, sub)
    return 'granted'
  } catch (e) {
    console.warn('Push subscribe failed:', e?.message || e)
    return 'error'
  }
}

// Silent: if the user has already granted permission on this device, make sure
// a current subscription exists in the DB (e.g. after the keys rotate or the
// row was cleared). Safe to call on every login — does nothing otherwise.
export async function syncPush(userId) {
  if (!pushSupported() || !pushConfigured() || !userId) return
  if (Notification.permission !== 'granted') return
  try {
    const sub = await getOrCreateSubscription()
    await saveSubscription(userId, sub)
  } catch (_) { /* ignore */ }
}

export async function disablePush() {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch (_) { /* ignore */ }
}
