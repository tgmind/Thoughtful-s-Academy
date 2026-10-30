/**
 * imageOptimizer.js
 * Browser-Native Multi-Resolution WebP Optimization Engine
 *
 * Converts high-resolution images (PNG, JPEG, HEIC, WebP) to performant,
 * hardware-accelerated WebP responsive variants directly on the client.
 *
 * Features:
 * - Zero external APIs or paid dependencies (pure HTML5 Canvas + WebP encoder).
 * - Multi-resolution generation (Desktop 2K/Retina, Tablet, Mobile).
 * - Focal-point preservation (e.g. subject face centering via object-position).
 * - Alpha transparency preservation for cutouts (Slide 2 Mentor portrait).
 * - Instant in-browser compression analytics (savings %, byte counts).
 */

import { supabase } from '../lib/supabase'

/**
 * Format bytes to human-readable string (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Resolves a relative or absolute asset URL safely across environments
 */
export function resolveAssetUrl(srcUrl) {
  if (!srcUrl) return ''
  if (
    srcUrl.startsWith('http://') ||
    srcUrl.startsWith('https://') ||
    srcUrl.startsWith('data:') ||
    srcUrl.startsWith('blob:')
  ) {
    return srcUrl
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${srcUrl.startsWith('/') ? '' : '/'}${srcUrl}`
  }
  return `http://localhost${srcUrl.startsWith('/') ? '' : '/'}${srcUrl}`
}

export const LANDING_SLOTS = {
  hero_card_left: {
    slot_id: 'hero_card_left',
    title: 'Slide 1 — Left Card (Portrait Deck)',
    section: 'Hero Carousel (Slide 1)',
    aspectRatio: '4/5',
    ratioLabel: '4:5 Portrait',
    fit: 'cover',
    defaultObjectPosition: '50% 28%',
    recommendedDimensions: '960 × 1200 px',
    minDimensions: '800 × 1000 px',
    recommendedFormat: 'JPG, PNG, or WebP (High Resolution)',
    placementGuide: 'Displayed as the left flanking card in the Slide 1 Hero Deck on both Desktop and Mobile.',
    framingTip: 'Educator or student portrait. Keep the face vertically centered around 25%–30%. Use the focal point slider to fine-tune alignment.',
    defaultUrls: {
      desktop: '/rupan-left.webp',
      tablet: '/rupan-left.webp',
      mobile: '/rupan-left.webp',
    },
    defaultAlt: 'Rupan Sir — Gold Medalist, 1st Convocation MBBU',
    variants: [
      { name: 'desktop', width: 960, height: 1200, quality: 0.86 },
      { name: 'tablet',  width: 480, height: 600,  quality: 0.84 },
      { name: 'mobile',  width: 400, height: 500,  quality: 0.82 },
    ],
  },
  hero_card_center: {
    slot_id: 'hero_card_center',
    title: 'Slide 1 — Center Card (Brand Emblem)',
    section: 'Hero Carousel (Slide 1)',
    aspectRatio: '4/5',
    ratioLabel: '4:5 Portrait Container',
    fit: 'cover',
    defaultObjectPosition: 'center center',
    recommendedDimensions: '800 × 1000 px (or 1000 × 1000 px Square)',
    minDimensions: '600 × 600 px',
    recommendedFormat: 'PNG with transparency, or high-res JPG/WebP',
    placementGuide: 'Central focal card of Slide 1 Hero Deck with brand badges and quick action buttons.',
    framingTip: 'Institute crest, academy insignia, or emblem. Center-aligned with clean padding around edges.',
    defaultUrls: {
      desktop: '/mainlogo.jpg',
      tablet: '/mainlogo.jpg',
      mobile: '/mainlogo.jpg',
    },
    defaultAlt: 'GRAViTON PHYSICS Emblem',
    variants: [
      { name: 'desktop', width: 960, height: 1200, quality: 0.86 },
      { name: 'tablet',  width: 480, height: 600,  quality: 0.84 },
      { name: 'mobile',  width: 400, height: 500,  quality: 0.82 },
    ],
  },
  hero_card_right: {
    slot_id: 'hero_card_right',
    title: 'Slide 1 — Right Card (Portrait Deck)',
    section: 'Hero Carousel (Slide 1)',
    aspectRatio: '4/5',
    ratioLabel: '4:5 Portrait',
    fit: 'cover',
    defaultObjectPosition: '50% 24%',
    recommendedDimensions: '960 × 1200 px',
    minDimensions: '800 × 1000 px',
    recommendedFormat: 'JPG, PNG, or WebP (High Resolution)',
    placementGuide: 'Displayed as the right flanking card in the Slide 1 Hero Deck on Desktop and Mobile.',
    framingTip: 'Educator or academic guide portrait. Keep the head centered around 20%–25% vertical position for optimal card framing.',
    defaultUrls: {
      desktop: '/rupan-right.webp',
      tablet: '/rupan-right.webp',
      mobile: '/rupan-right.webp',
    },
    defaultAlt: 'Rupan Sir — NITian & Physics Mentor',
    variants: [
      { name: 'desktop', width: 960, height: 1200, quality: 0.86 },
      { name: 'tablet',  width: 480, height: 600,  quality: 0.84 },
      { name: 'mobile',  width: 400, height: 500,  quality: 0.82 },
    ],
  },
  mentor_slide_hero: {
    slot_id: 'mentor_slide_hero',
    title: 'Slide 2 — Mentor Portrait Cutout',
    section: 'Hero Carousel (Slide 2 - Mentor)',
    aspectRatio: 'contain',
    ratioLabel: 'Cutout Aspect Ratio',
    fit: 'contain',
    defaultObjectPosition: 'center bottom',
    recommendedDimensions: '1200 × 900 px (or 1000 × 1000 px)',
    minDimensions: '800 × 600 px',
    recommendedFormat: 'Transparent PNG cutout (Background Removed)',
    placementGuide: 'Floats on Slide 2 over the soft radiant halo with an automatic feathered waist mask and contact drop-shadow.',
    framingTip: 'CRITICAL: Upload an image with the background removed (transparent PNG). Alpha transparency is preserved 100% in generated WebP files.',
    defaultUrls: {
      desktop: '/rupan.webp',
      tablet: '/rupan.webp',
      mobile: '/rupan.webp',
    },
    defaultAlt: 'GRAViTON PHYSICS Lead Mentor',
    variants: [
      { name: 'desktop', width: 1200, height: 900, quality: 0.88 },
      { name: 'tablet',  width: 800,  height: 600, quality: 0.85 },
      { name: 'mobile',  width: 600,  height: 450, quality: 0.82 },
    ],
  },
  banner_desktop: {
    slot_id: 'banner_desktop',
    title: 'Panoramic Trust Banner (Desktop & Tablet)',
    section: 'Trust & Methodology Banner',
    aspectRatio: '3/1',
    ratioLabel: '3:1 Ultra-Wide Panoramic',
    fit: 'cover',
    defaultObjectPosition: '50% 20%',
    recommendedDimensions: '2172 × 724 px (or 2400 × 800 px)',
    minDimensions: '1920 × 640 px',
    recommendedFormat: 'High-Res JPG, PNG, or WebP',
    placementGuide: 'Full-width cinematic banner rendered on Desktop & Tablet screens (viewport width ≥ 641px).',
    framingTip: 'Compose key visuals (mentor, apparatus, highlights) in the center and right areas. The left quadrant carries the "6+ Years Experience" headline on desktop.',
    defaultUrls: {
      desktop: '/banner.webp',
      tablet: '/banner-1200.webp',
      mobile: '/banner-720.webp',
    },
    defaultAlt: 'GRAViTON PHYSICS Pedagogy & Mentorship',
    variants: [
      { name: 'desktop', width: 2172, height: 724, quality: 0.85 },
      { name: 'tablet',  width: 1200, height: 400, quality: 0.82 },
      { name: 'mobile',  width: 720,  height: 240, quality: 0.80 },
    ],
  },
  banner_mobile: {
    slot_id: 'banner_mobile',
    title: 'Panoramic Trust Banner (Mobile Art-Directed)',
    section: 'Trust & Methodology Banner',
    aspectRatio: '4/3',
    ratioLabel: '4:3 Mobile Art-Directed',
    fit: 'cover',
    defaultObjectPosition: 'center center',
    recommendedDimensions: '1100 × 825 px (or 1200 × 900 px)',
    minDimensions: '600 × 450 px',
    recommendedFormat: 'High-Res JPG, PNG, or WebP',
    placementGuide: 'Full-width mobile banner for smartphones and compact screens (viewport width ≤ 640px).',
    framingTip: 'Art-directed tighter framing where the educator and physics illustration are centered and punchy on narrow vertical displays.',
    defaultUrls: {
      desktop: '/banner-mobile.webp',
      tablet: '/banner-mobile.webp',
      mobile: '/banner-mobile-600.webp',
    },
    defaultAlt: 'GRAViTON PHYSICS Pedagogy & Mentorship Mobile',
    variants: [
      { name: 'desktop', width: 1100, height: 825, quality: 0.85 },
      { name: 'tablet',  width: 800,  height: 600, quality: 0.82 },
      { name: 'mobile',  width: 600,  height: 450, quality: 0.80 },
    ],
  },
}

/**
 * Parses object position percentage from strings like '50% 28%' or 'center top'
 */
function parsePosition(posStr = '50% 50%') {
  const parts = posStr.trim().split(/\s+/)
  let x = 0.5
  let y = 0.5

  const parseVal = (str) => {
    if (str.includes('%')) return parseFloat(str) / 100
    if (str === 'left' || str === 'top') return 0
    if (str === 'right' || str === 'bottom') return 1
    if (str === 'center') return 0.5
    return 0.5
  }

  if (parts.length >= 1) x = parseVal(parts[0])
  if (parts.length >= 2) y = parseVal(parts[1])

  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
}

/**
 * Loads an image from a File or Blob into an HTMLImageElement
 */
export function loadImageFromFile(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      return reject(new Error('No file provided'))
    }
    // Safety check against excessively large raw files (e.g. >25MB) to protect client memory
    if (fileOrBlob.size && fileOrBlob.size > 25 * 1024 * 1024) {
      return reject(new Error('File exceeds the 25MB limit. Please select a smaller image.'))
    }
    const img = new Image()
    const objectUrl = URL.createObjectURL(fileOrBlob)
    img.onload = () => {
      resolve({
        img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        revoke: () => URL.revokeObjectURL(objectUrl),
      })
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to decode image: ' + (err?.message || 'unknown error')))
    }
    img.src = objectUrl
  })
}

/**
 * Resizes, crops, and encodes a single image variant to WebP using HTML5 Canvas
 */
export function renderVariantToWebP(img, variantConfig, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { width: targetW, height: targetH, quality = 0.85 } = variantConfig
      const fit = options.fit || 'cover'
      const objectPosition = options.objectPosition || '50% 50%'

      const srcW = img.naturalWidth || img.width
      const srcH = img.naturalHeight || img.height

      let renderW = targetW
      let renderH = targetH
      let sx = 0
      let sy = 0
      let sWidth = srcW
      let sHeight = srcH

      if (fit === 'cover') {
        const targetRatio = targetW / targetH
        const srcRatio = srcW / srcH
        const { x: focalX, y: focalY } = parsePosition(objectPosition)

        if (srcRatio > targetRatio) {
          // Source is wider than target: crop sides
          sHeight = srcH
          sWidth = Math.round(srcH * targetRatio)
          const maxX = srcW - sWidth
          sx = Math.max(0, Math.min(maxX, Math.round(maxX * focalX)))
          sy = 0
        } else {
          // Source is taller than target: crop top/bottom
          sWidth = srcW
          sHeight = Math.round(srcW / targetRatio)
          const maxY = srcH - sHeight
          sy = Math.max(0, Math.min(maxY, Math.round(maxY * focalY)))
          sx = 0
        }
      } else if (fit === 'contain') {
        // Maintain original aspect ratio within bounding box without letterboxing
        const scale = Math.min(targetW / srcW, targetH / srcH)
        renderW = Math.max(1, Math.round(srcW * scale))
        renderH = Math.max(1, Math.round(srcH * scale))
        sx = 0
        sy = 0
        sWidth = srcW
        sHeight = srcH
      }

      const canvas = document.createElement('canvas')
      canvas.width = renderW
      canvas.height = renderH
      const ctx = canvas.getContext('2d', { alpha: true })

      if (!ctx) {
        return reject(new Error('Unable to obtain 2D canvas context'))
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.clearRect(0, 0, renderW, renderH)

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, renderW, renderH)

      // Fallback for test/jsdom environments where toBlob may not be implemented
      if (typeof canvas.toBlob !== 'function') {
        const dataUrl = canvas.toDataURL ? canvas.toDataURL('image/webp', quality) : ''
        return resolve({
          name: variantConfig.name,
          blob: new Blob([dataUrl], { type: 'image/webp' }),
          width: renderW,
          height: renderH,
          size: Math.round(dataUrl.length * 0.75),
          previewUrl: dataUrl,
        })
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('WebP canvas compression failed'))
          }
          const previewUrl = URL.createObjectURL(blob)
          resolve({
            name: variantConfig.name,
            blob,
            width: renderW,
            height: renderH,
            size: blob.size,
            previewUrl,
          })
        },
        'image/webp',
        quality
      )
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Optimizes a user-provided image file for a given slot.
 * Generates Desktop, Tablet, and Mobile WebP variants.
 */
export async function optimizeImageForSlot(file, slotId, customOptions = {}) {
  const slotDef = LANDING_SLOTS[slotId]
  if (!slotDef) {
    throw new Error(`Unknown landing slot: ${slotId}`)
  }

  const loaded = await loadImageFromFile(file)
  const options = {
    fit: customOptions.fit || slotDef.fit,
    objectPosition: customOptions.objectPosition || slotDef.defaultObjectPosition,
  }

  try {
    const variantPromises = slotDef.variants.map((v) =>
      renderVariantToWebP(loaded.img, v, options)
    )

    const renderedVariants = await Promise.all(variantPromises)

    const variantsMap = {}
    let totalOptimizedSize = 0

    renderedVariants.forEach((v) => {
      variantsMap[v.name] = v
      totalOptimizedSize += v.size
    })

    const originalSize = file.size
    const primarySize = variantsMap.desktop?.size || totalOptimizedSize
    const savingsPercent = Math.max(
      0,
      Math.round(((originalSize - primarySize) / originalSize) * 100)
    )

    return {
      slotId,
      originalSize,
      originalWidth: loaded.width,
      originalHeight: loaded.height,
      totalOptimizedSize,
      primarySize,
      savingsPercent,
      variants: variantsMap,
      objectPosition: options.objectPosition,
      revoke: () => {
        loaded.revoke()
        renderedVariants.forEach((v) => URL.revokeObjectURL(v.previewUrl))
      },
    }
  } catch (err) {
    loaded.revoke()
    throw err
  }
}

/**
 * Cleans up old or unneeded files in the 'landing-media' bucket for a specific slot.
 * Ensures storage quota is preserved and orphaned WebP variants are promptly purged.
 */
export async function cleanSlotStorageFiles(slotId, keepFileNames = []) {
  const bucketName = 'landing-media'
  try {
    // 1. Clean folder-scoped files: `${slotId}/*`
    const { data: folderFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list(slotId)

    if (!listError && folderFiles && folderFiles.length > 0) {
      const filesToDelete = folderFiles
        .filter((f) => f && f.name && !keepFileNames.includes(f.name))
        .map((f) => `${slotId}/${f.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage.from(bucketName).remove(filesToDelete)
      }
    }

    // 2. Also clean any legacy root files matching `${slotId}_*`
    const { data: rootFiles } = await supabase.storage.from(bucketName).list('')
    if (rootFiles && rootFiles.length > 0) {
      const rootToDelete = rootFiles
        .filter((f) => f && f.name && f.name.startsWith(`${slotId}_`) && !keepFileNames.includes(f.name))
        .map((f) => f.name)

      if (rootToDelete.length > 0) {
        await supabase.storage.from(bucketName).remove(rootToDelete)
      }
    }
  } catch (err) {
    console.warn(`Storage cleanup for slot ${slotId} encountered non-critical error:`, err?.message || err)
  }
}

/**
 * Global audit and purge for 'landing-media' bucket.
 * Compares files in storage against currently active records in public.landing_media,
 * deleting any orphaned or abandoned WebP variants.
 */
export async function cleanOrphanedLandingMediaStorage() {
  const bucketName = 'landing-media'
  try {
    // 1. Fetch active URLs from the database
    const { data: activeRows, error: dbError } = await supabase
      .from('landing_media')
      .select('slot_id, desktop_url, tablet_url, mobile_url, is_custom')

    if (dbError) throw dbError

    const activeUrlSet = new Set()
    if (activeRows) {
      activeRows.forEach((row) => {
        if (row.is_custom) {
          if (row.desktop_url) activeUrlSet.add(row.desktop_url)
          if (row.tablet_url) activeUrlSet.add(row.tablet_url)
          if (row.mobile_url) activeUrlSet.add(row.mobile_url)
        }
      })
    }

    let purgedCount = 0
    const filesToPurge = []

    // 2. Check each slot folder
    for (const slotId of Object.keys(LANDING_SLOTS)) {
      const { data: files } = await supabase.storage.from(bucketName).list(slotId)
      if (files && files.length > 0) {
        for (const file of files) {
          if (!file || !file.name || file.name === '.emptyFolderPlaceholder') continue
          const filePath = `${slotId}/${file.name}`
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath)

          // If the file's public URL is not in the active database set, it is orphaned
          if (!activeUrlSet.has(publicUrlData.publicUrl)) {
            filesToPurge.push(filePath)
          }
        }
      }
    }

    // 3. Also check legacy root files matching `${slotId}_*`
    const { data: rootFiles } = await supabase.storage.from(bucketName).list('')
    if (rootFiles && rootFiles.length > 0) {
      for (const file of rootFiles) {
        if (!file || !file.name || file.name === '.emptyFolderPlaceholder') continue
        if (Object.keys(LANDING_SLOTS).some((s) => file.name.startsWith(`${s}_`))) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(file.name)
          if (!activeUrlSet.has(publicUrlData.publicUrl)) {
            filesToPurge.push(file.name)
          }
        }
      }
    }

    if (filesToPurge.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucketName)
        .remove(filesToPurge)
      if (!removeError) {
        purgedCount = filesToPurge.length
      }
    }

    return { success: true, purgedCount, purgedFiles: filesToPurge }
  } catch (err) {
    console.error('Orphaned storage audit error:', err)
    return { success: false, purgedCount: 0, error: err.message }
  }
}

/**
 * Updates settings (object_position, alt_text) of any slot in public.landing_media
 * Supports both custom and default/current slots.
 */
export async function updateSlotMetadata(slotId, { objectPosition, altText } = {}) {
  const slotDef = LANDING_SLOTS[slotId]
  if (!slotDef) throw new Error(`Invalid slot: ${slotId}`)

  const payload = {
    updated_at: new Date().toISOString(),
  }
  if (objectPosition) payload.object_position = objectPosition
  if (altText !== undefined) payload.alt_text = altText

  const { data, error } = await supabase
    .from('landing_media')
    .update(payload)
    .eq('slot_id', slotId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update slot settings: ${error.message}`)
  }
  return data
}

/**
 * Updates only the object_position (focal point) of an existing slot
 */
export async function updateSlotObjectPosition(slotId, objectPosition) {
  return updateSlotMetadata(slotId, { objectPosition })
}

/**
 * Retrieves real-time Supabase Storage telemetry including total bytes,
 * remaining storage quota, percent used, and per-bucket breakdowns.
 */
export async function fetchStorageStats() {
  const quotaBytes = 1073741824 // 1 GB standard Supabase project quota

  try {
    const { data, error } = await supabase.rpc('get_storage_telemetry')
    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('RPC get_storage_telemetry unavailable, calculating client-side:', err)
  }

  // Graceful client-side fallback if RPC is mocked or unavailable
  try {
    const { data: files } = await supabase.storage.from('landing-media').list()
    let landingBytes = 0
    let landingFiles = 0
    if (files && Array.isArray(files)) {
      files.forEach((f) => {
        if (f.metadata?.size) {
          landingBytes += f.metadata.size
          landingFiles++
        }
      })
    }
    const remainingBytes = Math.max(0, quotaBytes - landingBytes)
    return {
      total_bytes: landingBytes,
      total_files: landingFiles,
      landing_media_bytes: landingBytes,
      landing_media_files: landingFiles,
      other_bytes: 0,
      quota_bytes: quotaBytes,
      remaining_bytes: remainingBytes,
      percent_used: parseFloat(((landingBytes / quotaBytes) * 100).toFixed(2)),
      buckets: [{ bucket_id: 'landing-media', name: 'landing-media', bytes: landingBytes, file_count: landingFiles, public: true }],
      as_of: new Date().toISOString(),
    }
  } catch {
    return {
      total_bytes: 0,
      total_files: 0,
      landing_media_bytes: 0,
      landing_media_files: 0,
      other_bytes: 0,
      quota_bytes: quotaBytes,
      remaining_bytes: quotaBytes,
      percent_used: 0,
      buckets: [],
      as_of: new Date().toISOString(),
    }
  }
}

/**
 * Syncs the current bundled landing assets into Supabase Storage
 * so they become fully managed, tweakable custom WebP assets in the new architecture.
 * Safely skips slots that have already been customized unless skipCustom is false.
 */
export async function syncCurrentAssetsToStorage(onProgress, options = {}) {
  const { skipCustom = true } = options
  const results = []
  const slotKeys = Object.keys(LANDING_SLOTS)

  let customSlotIds = new Set()
  if (skipCustom) {
    try {
      const { data } = await supabase
        .from('landing_media')
        .select('slot_id, is_custom')
      if (data) {
        data.forEach((row) => {
          if (row.is_custom) customSlotIds.add(row.slot_id)
        })
      }
    } catch (e) {
      console.warn('Could not check custom slots before sync:', e)
    }
  }

  for (let i = 0; i < slotKeys.length; i++) {
    const slotId = slotKeys[i]
    const slotDef = LANDING_SLOTS[slotId]

    if (skipCustom && customSlotIds.has(slotId)) {
      results.push({
        slotId,
        success: true,
        skipped: true,
        message: 'Slot already customized with uploaded graphic',
      })
      continue
    }

    if (onProgress) onProgress({ current: i + 1, total: slotKeys.length, slotId, title: slotDef.title })

    try {
      const srcUrl = resolveAssetUrl(slotDef.defaultUrls.desktop)
      const res = await fetch(srcUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${srcUrl}`)
      const blob = await res.blob()
      const ext = srcUrl.split('.').pop()?.split('?')[0] || 'webp'
      const file = new File([blob], `${slotId}.${ext}`, { type: blob.type || 'image/webp' })

      const optimized = await optimizeImageForSlot(file, slotId, {
        objectPosition: slotDef.defaultObjectPosition,
      })

      const uploaded = await uploadLandingSlotMedia(slotId, optimized, {
        title: slotDef.title,
        alt_text: slotDef.defaultAlt,
      })

      if (optimized.revoke) optimized.revoke()
      results.push({ slotId, success: true, data: uploaded })
    } catch (err) {
      console.warn(`Sync failed for ${slotId}:`, err)
      results.push({ slotId, success: false, error: err.message })
    }
  }

  return results
}

/**
 * Safe image error fallback handler that updates both the img element and any
 * enclosing <picture> <source> elements so that fallback is reliable across all browsers.
 */
export function handleImageFallback(event, fallbackUrl) {
  if (!event || !event.currentTarget) return
  const img = event.currentTarget
  if (img.dataset.failedFallback) return
  img.dataset.failedFallback = 'true'

  const picture = img.closest('picture')
  if (picture) {
    const sources = picture.querySelectorAll('source')
    sources.forEach((source) => {
      source.srcset = fallbackUrl
    })
  }
  img.src = fallbackUrl
}

/**
 * Uploads generated WebP variants to Supabase Storage ('landing-media' bucket)
 * and updates public.landing_media row. Automatically cleans up obsolete previous files.
 */
export async function uploadLandingSlotMedia(slotId, optimizedResult, metadata = {}) {
  const slotDef = LANDING_SLOTS[slotId]
  if (!slotDef) {
    throw new Error(`Invalid slot: ${slotId}`)
  }

  const timestamp = Date.now()
  const bucketName = 'landing-media'
  const urls = {}
  const uploadedFileNames = []

  // Upload each variant blob with unique timestamped file path
  for (const variantName of Object.keys(optimizedResult.variants)) {
    const variant = optimizedResult.variants[variantName]
    const fileName = `${slotId}_${variantName}_${timestamp}.webp`
    const filePath = `${slotId}/${fileName}`
    uploadedFileNames.push(fileName)

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, variant.blob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload ${variantName} WebP: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    urls[`${variantName}_url`] = publicUrlData.publicUrl
  }

  // Update public.landing_media record
  const updatePayload = {
    slot_id: slotId,
    title: metadata.title || slotDef.title,
    section: slotDef.section,
    desktop_url: urls.desktop_url || urls.mobile_url,
    tablet_url: urls.tablet_url || urls.desktop_url,
    mobile_url: urls.mobile_url || urls.desktop_url,
    object_position: optimizedResult.objectPosition || slotDef.defaultObjectPosition,
    alt_text: metadata.alt_text || slotDef.defaultAlt,
    aspect_ratio: slotDef.aspectRatio,
    is_custom: true,
    updated_at: new Date().toISOString(),
  }

  const { data, error: dbError } = await supabase
    .from('landing_media')
    .upsert(updatePayload, { onConflict: 'slot_id' })
    .select()
    .single()

  if (dbError) {
    throw new Error(`Failed to update media slot record: ${dbError.message}`)
  }

  // Proactive storage hygiene: purge prior obsolete variant files for this slot
  await cleanSlotStorageFiles(slotId, uploadedFileNames)

  return data
}

/**
 * Restores a slot back to its bundled original default assets and cleans up storage
 */
export async function resetLandingSlotToDefault(slotId) {
  const slotDef = LANDING_SLOTS[slotId]
  if (!slotDef) {
    throw new Error(`Invalid slot: ${slotId}`)
  }

  const resetPayload = {
    slot_id: slotId,
    title: slotDef.title,
    section: slotDef.section,
    desktop_url: slotDef.defaultUrls.desktop,
    tablet_url: slotDef.defaultUrls.tablet,
    mobile_url: slotDef.defaultUrls.mobile,
    object_position: slotDef.defaultObjectPosition,
    alt_text: slotDef.defaultAlt,
    aspect_ratio: slotDef.aspectRatio,
    is_custom: false,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('landing_media')
    .upsert(resetPayload, { onConflict: 'slot_id' })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to reset slot: ${error.message}`)
  }

  // Clean up all custom uploaded files from storage for this slot
  await cleanSlotStorageFiles(slotId, [])

  return data
}
