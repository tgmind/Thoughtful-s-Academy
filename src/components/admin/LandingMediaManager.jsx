import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image as ImageIcon,
  UploadCloud,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Maximize2,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import {
  LANDING_SLOTS,
  optimizeImageForSlot,
  uploadLandingSlotMedia,
  resetLandingSlotToDefault,
} from '../../utils/imageOptimizer'

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function SlotCard({ slotKey, slotDef, currentData, onRefresh }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [optimizedResult, setOptimizedResult] = useState(null)
  const [focalY, setFocalY] = useState(() => {
    const pos = currentData?.object_position || slotDef.defaultObjectPosition
    const match = pos.match(/(\d+)%/)
    return match ? parseInt(match[1], 10) : 50
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [previewDevice, setPreviewDevice] = useState('desktop') // 'desktop' | 'mobile'
  const fileInputRef = useRef(null)

  useEffect(() => {
    const pos = currentData?.object_position || slotDef.defaultObjectPosition
    const match = pos.match(/(\d+)%/)
    if (match) {
      setFocalY(parseInt(match[1], 10))
    }
  }, [currentData?.object_position, slotDef.defaultObjectPosition])

  const handleFileDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer?.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  const processFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop a valid image file (PNG, JPG, WebP).')
      return
    }

    setSelectedFile(file)
    setOptimizing(true)
    try {
      const positionStr = `50% ${focalY}%`
      const result = await optimizeImageForSlot(file, slotKey, {
        objectPosition: positionStr,
      })
      setOptimizedResult(result)
      toast.success(
        `WebP compressed: ${formatBytes(file.size)} ➔ ${formatBytes(result.primarySize)} (-${result.savingsPercent}%)`
      )
    } catch (err) {
      console.error('Optimization error:', err)
      toast.error('Failed to optimize image: ' + err.message)
      setOptimizedResult(null)
      setSelectedFile(null)
    } finally {
      setOptimizing(false)
    }
  }

  const handleFocalChange = async (newVal) => {
    setFocalY(newVal)
    if (selectedFile) {
      try {
        const positionStr = `50% ${newVal}%`
        const result = await optimizeImageForSlot(selectedFile, slotKey, {
          objectPosition: positionStr,
        })
        setOptimizedResult(result)
      } catch (err) {
        console.error('Re-slice error:', err)
      }
    }
  }

  const handlePublish = async () => {
    if (!optimizedResult) return
    setUploading(true)
    try {
      await uploadLandingSlotMedia(slotKey, optimizedResult, {
        title: slotDef.title,
        alt_text: currentData?.alt_text || slotDef.defaultAlt,
      })
      toast.success(`${slotDef.title} published with optimized WebP!`)
      if (optimizedResult.revoke) optimizedResult.revoke()
      setOptimizedResult(null)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onRefresh()
    } catch (err) {
      console.error('Publish error:', err)
      toast.error('Failed to publish image: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!window.confirm(`Reset "${slotDef.title}" back to the original default graphics?`)) {
      return
    }
    setUploading(true)
    try {
      await resetLandingSlotToDefault(slotKey)
      toast.success(`Restored original default for ${slotDef.title}`)
      if (optimizedResult?.revoke) optimizedResult.revoke()
      setOptimizedResult(null)
      setSelectedFile(null)
      onRefresh()
    } catch (err) {
      toast.error('Failed to reset: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleCancelPreview = () => {
    if (optimizedResult?.revoke) optimizedResult.revoke()
    setOptimizedResult(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const activeUrl =
    previewDevice === 'mobile'
      ? currentData?.mobile_url || currentData?.desktop_url
      : currentData?.desktop_url

  const previewSrc =
    optimizedResult?.variants[previewDevice]?.previewUrl ||
    optimizedResult?.variants.desktop?.previewUrl ||
    activeUrl ||
    slotDef.defaultUrls.desktop

  const isCustom = currentData?.is_custom ?? false

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* Slot Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-gray-900 truncate">
              {slotDef.title}
            </h3>
            {isCustom ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>Custom Live</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-medium shrink-0">
                <span>Default</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {slotDef.section} · Aspect Ratio: <span className="font-mono font-medium text-gray-700">{slotDef.aspectRatio}</span>
          </p>
        </div>

        {/* Device preview toggles */}
        <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              previewDevice === 'desktop'
                ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              previewDevice === 'mobile'
                ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-3 h-3" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Preview on Left, Dropzone on Right */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center flex-1">
        {/* Preview Container */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div
            className={`relative rounded-xl overflow-hidden bg-slate-950 border border-gray-200 shadow-inner flex items-center justify-center ${
              slotDef.aspectRatio === '4/5'
                ? 'w-full max-w-[200px] aspect-[4/5]'
                : slotDef.aspectRatio === '3/1'
                ? 'w-full aspect-[3/1]'
                : slotDef.aspectRatio === '4/3'
                ? 'w-full max-w-[240px] aspect-[4/3]'
                : 'w-full max-w-[220px] h-[190px]'
            }`}
          >
            <img
              src={previewSrc}
              alt={slotDef.title}
              className={`w-full h-full ${
                slotDef.fit === 'contain' ? 'object-contain' : 'object-cover'
              } transition-all duration-300`}
              style={{
                objectPosition: `50% ${focalY}%`,
              }}
            />

            {optimizing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 p-3 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-amber-400 animate-spin" />
                <span className="text-[11px] font-medium">Encoding WebP...</span>
              </div>
            )}
          </div>

          <div className="mt-2 text-center">
            <span className="text-[11px] text-gray-500 font-mono">
              Focal Point: 50% {focalY}%
            </span>
          </div>
        </div>

        {/* Dropzone & Actions */}
        <div className="md:col-span-7 flex flex-col justify-between h-full gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                : optimizedResult
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-gray-200 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                optimizedResult
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <UploadCloud className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-800">
                {optimizedResult
                  ? 'Ready to publish!'
                  : 'Drag & drop high-res image here'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                or <span className="text-indigo-600 font-medium underline">browse files</span> (PNG, JPG, WebP)
              </p>
            </div>
          </div>

          {/* Realtime Compression Analytics */}
          {optimizedResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/90 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between font-semibold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Client-Side WebP Generated</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  -{optimizedResult.savingsPercent}% Smaller
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-emerald-900/80 pt-1 font-mono">
                <div>Original: <span className="font-bold">{formatBytes(optimizedResult.originalSize)}</span></div>
                <div>WebP: <span className="font-bold">{formatBytes(optimizedResult.primarySize)}</span></div>
                <div>Multi-Res: <span className="font-bold">3 tiers</span></div>
              </div>
            </motion.div>
          )}

          {/* Focal Point Alignment Controls (Collapsible / Accordion) */}
          {slotDef.fit === 'cover' && (
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor={`focal-slider-${slotKey}`}
                  className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-gray-500" />
                  <span>Vertical Focal Position (Face Centering)</span>
                </label>
                <span className="text-xs font-mono font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {focalY}%
                </span>
              </div>
              <input
                id={`focal-slider-${slotKey}`}
                type="range"
                min="0"
                max="100"
                value={focalY}
                onChange={(e) => handleFocalChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>Top (0%)</span>
                <span>Subject Face (25-30%)</span>
                <span>Bottom (100%)</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div>
              {isCustom && !optimizedResult && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 text-xs font-medium transition-colors bg-white shadow-2xs cursor-pointer"
                  title="Restore bundled local asset"
                >
                  <RotateCcw className="w-3 h-3 text-gray-500" />
                  <span>Restore Default</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {optimizedResult && (
                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {optimizedResult && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save &amp; Publish WebP</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingMediaManager() {
  const [mediaList, setMediaList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('landing_media')
        .select('*')

      if (error) {
        console.error('Error fetching landing media:', error)
      } else {
        setMediaList(data || [])
      }
    } catch (err) {
      console.error('Failed to load landing media:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [])

  const mediaMap = {}
  mediaList.forEach((m) => {
    if (m && m.slot_id) mediaMap[m.slot_id] = m
  })

  // Logical groupings for easy administration
  const GROUPS = [
    {
      groupTitle: '1. Hero Carousel — 3 Portrait Deck Cards (Slide 1)',
      groupDesc: 'Customize the left, center, and right cards displayed in the opening hero deck.',
      slots: ['hero_card_left', 'hero_card_center', 'hero_card_right'],
    },
    {
      groupTitle: '2. Hero Carousel — Lead Mentor Portrait (Slide 2)',
      groupDesc: 'Lead educator portrait cutout displayed on the mentorship slide.',
      slots: ['mentor_slide_hero'],
    },
    {
      groupTitle: '3. Panoramic Trust & Experience Banner',
      groupDesc: 'Wide panoramic banner and mobile art-directed crop for the pedagogy section.',
      slots: ['banner_desktop', 'banner_mobile'],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-[#1c1c1c] via-[#242424] to-[#141414] text-white shadow-md border border-white/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold tracking-wide uppercase">
            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Zero-API Auto-WebP Optimization</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Landing Page Media &amp; Banners
          </h2>
          <p className="text-xs text-white/70 max-w-xl leading-relaxed">
            Drag and drop high-resolution images. The browser natively encodes lightweight,
            multi-resolution WebP files and uploads them to Supabase Storage with instant cache-busting.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMedia}
          disabled={loading}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Refresh slot status"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Slot Groups */}
      <div className="space-y-8">
        {GROUPS.map((group) => (
          <div key={group.groupTitle} className="space-y-3.5">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 tracking-tight">
                {group.groupTitle}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {group.groupDesc}
              </p>
            </div>

            <div className="space-y-4">
              {group.slots.map((slotKey) => {
                const slotDef = LANDING_SLOTS[slotKey]
                if (!slotDef) return null
                return (
                  <SlotCard
                    key={slotKey}
                    slotKey={slotKey}
                    slotDef={slotDef}
                    currentData={mediaMap[slotKey]}
                    onRefresh={fetchMedia}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
