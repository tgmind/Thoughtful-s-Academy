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

export const LANDING_SLOTS = {
  hero_card_left: {
    slot_id: 'hero_card_left',
    title: 'Slide 1 — Left Card (Portrait Deck)',
    section: 'Hero Carousel (Slide 1)',
    aspectRatio: '4/5',
    fit: 'cover',
    defaultObjectPosition: '50% 28%',
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
    fit: 'cover',
    defaultObjectPosition: 'center center',
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
    fit: 'cover',
    defaultObjectPosition: '50% 24%',
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
    fit: 'contain',
    defaultObjectPosition: 'center bottom',
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
    fit: 'cover',
    defaultObjectPosition: '50% 20%',
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
    fit: 'cover',
    defaultObjectPosition: 'center center',
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
 * Uploads generated WebP variants to Supabase Storage ('landing-media' bucket)
 * and updates public.landing_media row.
 */
export async function uploadLandingSlotMedia(slotId, optimizedResult, metadata = {}) {
  const slotDef = LANDING_SLOTS[slotId]
  if (!slotDef) {
    throw new Error(`Invalid slot: ${slotId}`)
  }

  const timestamp = Date.now()
  const bucketName = 'landing-media'
  const urls = {}

  // Upload each variant blob with unique timestamped file path
  for (const variantName of Object.keys(optimizedResult.variants)) {
    const variant = optimizedResult.variants[variantName]
    const filePath = `${slotId}/${slotId}_${variantName}_${timestamp}.webp`

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

  return data
}

/**
 * Restores a slot back to its bundled original default assets
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

  return data
}
