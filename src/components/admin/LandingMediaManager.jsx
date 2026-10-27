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
  Trash2,
  Info,
  HelpCircle,
  Compass,
  FileCheck2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import {
  LANDING_SLOTS,
  optimizeImageForSlot,
  uploadLandingSlotMedia,
  resetLandingSlotToDefault,
  updateSlotObjectPosition,
  cleanOrphanedLandingMediaStorage,
} from '../../utils/imageOptimizer'

function isValidImageFile(file) {
  if (!file) return false
  if (file.type && file.type.startsWith('image/')) return true
  const ext = file.name?.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext)
}

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
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [altText, setAltText] = useState(currentData?.alt_text || slotDef.defaultAlt || '')
  const [previewDevice, setPreviewDevice] = useState('desktop') // 'desktop' | 'mobile'
  const fileInputRef = useRef(null)

  useEffect(() => {
    const pos = currentData?.object_position || slotDef.defaultObjectPosition
    const match = pos.match(/(\d+)%/)
    if (match) {
      setFocalY(parseInt(match[1], 10))
    }
  }, [currentData?.object_position, slotDef.defaultObjectPosition])

  useEffect(() => {
    if (currentData?.alt_text) {
      setAltText(currentData.alt_text)
    }
  }, [currentData?.alt_text])

  // Clean up blob URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (optimizedResult?.revoke) {
        optimizedResult.revoke()
      }
    }
  }, [optimizedResult])

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
    if (!isValidImageFile(file)) {
      toast.error('Please drop a valid image file (PNG, JPG, WebP, AVIF).')
      return
    }

    // Revoke previous blob URLs if any
    if (optimizedResult?.revoke) {
      optimizedResult.revoke()
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

  // Realtime 60fps slider visual update
  const handleFocalSliderInput = (newVal) => {
    setFocalY(newVal)
  }

  // Re-encode WebP variants on slider commit (release)
  const handleFocalCommit = async (commitVal) => {
    const val = commitVal !== undefined ? commitVal : focalY
    if (selectedFile) {
      try {
        const positionStr = `50% ${val}%`
        const result = await optimizeImageForSlot(selectedFile, slotKey, {
          objectPosition: positionStr,
        })
        if (optimizedResult?.revoke) optimizedResult.revoke()
        setOptimizedResult(result)
      } catch (err) {
        console.error('Re-slice error:', err)
      }
    }
  }

  const isCustom = currentData?.is_custom ?? false

  // Saves focal position for an already-uploaded custom graphic
  const currentFocalPercent = () => {
    const pos = currentData?.object_position || slotDef.defaultObjectPosition
    const match = pos.match(/(\d+)%/)
    return match ? parseInt(match[1], 10) : 50
  }
  const isFocalChanged = isCustom && !optimizedResult && focalY !== currentFocalPercent()

  const handleSaveFocalPositionOnly = async () => {
    setUploading(true)
    try {
      const positionStr = `50% ${focalY}%`
      await updateSlotObjectPosition(slotKey, positionStr)
      toast.success(`Updated focal alignment for ${slotDef.title}`)
      onRefresh()
    } catch (err) {
      toast.error('Failed to update focal position: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePublish = async () => {
    if (!optimizedResult) return
    setUploading(true)
    try {
      await uploadLandingSlotMedia(slotKey, optimizedResult, {
        title: slotDef.title,
        alt_text: altText.trim() || currentData?.alt_text || slotDef.defaultAlt,
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

      {/* Recommended Dimensions & Format Specifications Bar */}
      <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/90 text-indigo-900 border border-indigo-200/70 font-medium">
          <Maximize2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Target: <strong className="font-semibold">{slotDef.recommendedDimensions}</strong></span>
          <span className="text-indigo-600/70 font-mono text-[11px]">({slotDef.ratioLabel || slotDef.aspectRatio})</span>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
          slotDef.fit === 'contain'
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-slate-100 text-slate-800 border-slate-200'
        }`}>
          <ImageIcon className={`w-3.5 h-3.5 shrink-0 ${slotDef.fit === 'contain' ? 'text-amber-600' : 'text-slate-600'}`} />
          <span>Format: <strong className="font-semibold">{slotDef.recommendedFormat}</strong></span>
        </div>

        <div className="inline-flex items-center gap-1 text-gray-500 text-[11px] font-mono">
          <span>Min: {slotDef.minDimensions}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowGuidelines(!showGuidelines)}
          className="ml-auto inline-flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors text-[11px] font-medium cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>{showGuidelines ? 'Hide Guide' : 'Placement & Framing Guide'}</span>
          {showGuidelines ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expandable Framing & Placement Guidance Drawer */}
      <AnimatePresence>
        {showGuidelines && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 py-3 bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/30 border-b border-indigo-100/80 text-xs text-indigo-950 space-y-2 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-3 font-semibold text-indigo-900 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Where it appears:</span>
              </div>
              <div className="sm:col-span-9 text-gray-700 leading-relaxed">
                {slotDef.placementGuide}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1.5 border-t border-indigo-100/60">
              <div className="sm:col-span-3 font-semibold text-indigo-900 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span>Framing rule:</span>
              </div>
              <div className="sm:col-span-9 text-gray-700 leading-relaxed font-sans">
                {slotDef.framingTip}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid: Preview on Left, Dropzone on Right */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center flex-1">
        {/* Preview Container */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div
            className={`relative rounded-xl overflow-hidden ${
              slotDef.fit === 'contain'
                ? 'bg-gradient-to-b from-[#faf8f3] via-white to-[#f7f4ed]'
                : 'bg-slate-950'
            } border border-gray-200 shadow-inner flex items-center justify-center ${
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
              <p className="text-[10px] text-indigo-700/80 font-mono mt-1 font-medium">
                Target: {slotDef.recommendedDimensions}
              </p>
            </div>
          </div>

          {/* Realtime Compression & Live Dimension Analytics */}
          {optimizedResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200 text-xs space-y-2"
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

              {/* Source vs Output Dimensions Comparison */}
              <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-100 grid grid-cols-2 gap-2 text-[11px] text-emerald-950">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-medium">Source Image:</span>
                  <span className="font-mono font-semibold">{optimizedResult.originalWidth} × {optimizedResult.originalHeight} px</span>
                  <span className="text-gray-500 ml-1 font-mono">({formatBytes(optimizedResult.originalSize)})</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-medium">Desktop WebP:</span>
                  <span className="font-mono font-semibold">{optimizedResult.variants.desktop?.width} × {optimizedResult.variants.desktop?.height} px</span>
                  <span className="text-emerald-700 font-semibold ml-1 font-mono">({formatBytes(optimizedResult.primarySize)})</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] text-emerald-900/80 pt-0.5 font-mono">
                <div>Tablet: <span className="font-bold">{optimizedResult.variants.tablet?.width} × {optimizedResult.variants.tablet?.height}</span></div>
                <div>Mobile: <span className="font-bold">{optimizedResult.variants.mobile?.width} × {optimizedResult.variants.mobile?.height}</span></div>
                <div className="text-right"><span className="font-bold text-emerald-700">3-Tier WebP</span></div>
              </div>
            </motion.div>
          )}

          {/* SEO & Accessibility Alt Text */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            >
              <span>Image Alt Text (SEO &amp; Accessibility)</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showAdvanced && (
              <div className="mt-1.5 space-y-1">
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder={slotDef.defaultAlt}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                />
                <p className="text-[10px] text-gray-500">
                  Screen reader description and search engine indexing attribute.
                </p>
              </div>
            )}
          </div>

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
                onChange={(e) => handleFocalSliderInput(parseInt(e.target.value, 10))}
                onPointerUp={(e) => handleFocalCommit(parseInt(e.target.value, 10))}
                onKeyUp={(e) => handleFocalCommit(parseInt(e.target.value, 10))}
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
            <div className="flex items-center gap-2">
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

              {isFocalChanged && (
                <button
                  type="button"
                  onClick={handleSaveFocalPositionOnly}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Save new focal alignment to the database"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Update Alignment ({focalY}%)</span>
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
  const [showCheatSheet, setShowCheatSheet] = useState(false)
  const [purging, setPurging] = useState(false)

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

  const handlePurgeStorage = async () => {
    if (!window.confirm('Scan Supabase Storage and remove any orphaned or abandoned WebP images?')) {
      return
    }
    setPurging(true)
    try {
      const res = await cleanOrphanedLandingMediaStorage()
      if (res.success) {
        if (res.purgedCount > 0) {
          toast.success(`Storage cleanup: Removed ${res.purgedCount} orphaned file(s).`)
        } else {
          toast.success('Storage is completely clean! Zero orphaned files found.')
        }
      } else {
        toast.error('Storage scan error: ' + res.error)
      }
    } catch (err) {
      toast.error('Storage purge error: ' + err.message)
    } finally {
      setPurging(false)
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            title="View recommended dimensions and specs for all landing slots"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{showCheatSheet ? 'Hide Specs' : 'Dimensions Cheat Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={handlePurgeStorage}
            disabled={purging || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Scan and delete unreferenced images from Supabase Storage"
          >
            <Trash2 className={`w-3.5 h-3.5 ${purging ? 'animate-pulse text-amber-400' : ''}`} />
            <span className="hidden sm:inline">{purging ? 'Scanning...' : 'Clean Storage'}</span>
          </button>

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
      </div>

      {/* Expandable Dimensions & Format Cheat Sheet */}
      <AnimatePresence>
        {showCheatSheet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Landing Page Assets Dimension &amp; Format Specifications
                  </h3>
                  <p className="text-xs text-gray-500">
                    Reference guide for admins and designers to ensure razor-sharp graphics across 4K, Retina, and mobile screens.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCheatSheet(false)}
                className="text-xs font-medium text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-semibold">
                    <th className="py-2 px-3">Slot / Section</th>
                    <th className="py-2 px-3">Target Resolution</th>
                    <th className="py-2 px-3">Aspect Ratio</th>
                    <th className="py-2 px-3">Min Resolution</th>
                    <th className="py-2 px-3">Format &amp; Transparency</th>
                    <th className="py-2 px-3">Framing &amp; Positioning Tip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                  {Object.entries(LANDING_SLOTS).map(([key, def]) => (
                    <tr key={key} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-gray-900 whitespace-nowrap">
                        <div className="font-bold text-xs">{def.title}</div>
                        <div className="text-[10px] text-gray-500 font-sans">{def.section}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-700 whitespace-nowrap">
                        {def.recommendedDimensions}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap font-sans">
                        {def.ratioLabel || def.aspectRatio}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        {def.minDimensions}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                          def.fit === 'contain'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {def.recommendedFormat}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-gray-600 max-w-xs text-[11px] leading-snug">
                        {def.framingTip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
