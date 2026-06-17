/* Web Push handler.
 *
 * This file is imported into the Workbox-generated service worker (see
 * vite.config.js → workbox.importScripts). It runs even when the website /
 * installed PWA is fully closed, so it can show a system notification and
 * focus or open the app when the user taps it.
 */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_) {
    data = { title: "Thoughtful's Academy", body: event.data ? event.data.text() : '' }
  }

  const title = data.title || "Thoughtful's Academy"
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    vibrate: [80, 40, 80],
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Focus an already-open tab/window if there is one.
    for (const client of all) {
      if ('focus' in client) {
        await client.focus()
        if (url && url !== '/' && 'navigate' in client) {
          try { await client.navigate(url) } catch (_) { /* ignore */ }
        }
        return
      }
    }
    // Otherwise open a fresh window.
    if (self.clients.openWindow) await self.clients.openWindow(url)
  })())
})
