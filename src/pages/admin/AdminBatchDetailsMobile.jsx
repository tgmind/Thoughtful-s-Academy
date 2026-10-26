import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Save, Plus, Trash2,
  Image as ImageIcon, Video, UserCheck, Sparkles, RefreshCw, ExternalLink, X, Clock,
  FileText, ChevronUp, ChevronDown, Search, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomSelect from '../../components/ui/CustomSelect'
import ActivityLogModal from '../../components/shared/ActivityLogModal'
import NotesPlaylistModal from '../../components/shared/NotesPlaylistModal'
import { logActivity } from '../../lib/activityLogger'

import DriveImage from '../../components/shared/DriveImage'
import { getYTThumb, getYTPlaylistId, fetchYouTubeOEmbed } from '../../utils/youtube'
import { formatBatchFeeBadge } from '../../utils/feeAccess'

// Rich Text Editor Toolbar Component
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const format = (command, valueArg = null) => {
    document.execCommand(command, false, valueArg)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertCallout = () => {
    const calloutHTML = `
      <div style="background-color: #f0f7ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
        <strong>💡 Key Highlight:</strong> Enter important announcement or batch specialty here...
      </div><p></p>
    `
    document.execCommand('insertHTML', false, calloutHTML)
    handleInput()
  }

  return (
    <div className={`rounded-xl border transition-all min-w-0 max-w-full overflow-hidden ${isFocused ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 rounded-t-xl text-gray-700 text-sm overflow-x-auto custom-scrollbar flex-nowrap sm:flex-wrap pb-2 sm:pb-2">
        <button type="button" onClick={() => format('bold')} title="Bold" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('italic')} title="Italic" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('underline')} title="Underline" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('strikeThrough')} title="Strikethrough" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <Strikethrough className="h-4 w-4" />
        </button>

        <span className="shrink-0 w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => format('formatBlock', '<h1>')} title="Heading 1" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-xs">
          H1
        </button>
        <button type="button" onClick={() => format('formatBlock', '<h2>')} title="Heading 2" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-xs">
          H2
        </button>
        <button type="button" onClick={() => format('formatBlock', '<h3>')} title="Heading 3" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-xs">
          H3
        </button>
        <button type="button" onClick={() => format('formatBlock', '<p>')} title="Paragraph" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700 text-xs">
          Paragraph
        </button>

        <span className="shrink-0 w-px h-5 bg-gray-300 mx-1" />

        <select
          onChange={(e) => format('foreColor', e.target.value)}
          className="shrink-0 h-8 px-1.5 text-xs rounded border border-gray-200 bg-white"
          title="Text Color"
        >
          <option value="#1e293b">Dark Text</option>
          <option value="#2563eb">Royal Blue</option>
          <option value="#059669">Emerald Green</option>
          <option value="#d97706">Amber Gold</option>
          <option value="#dc2626">Crimson Red</option>
          <option value="#7c3aed">Deep Purple</option>
        </select>

        <span className="shrink-0 w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => format('insertUnorderedList')} title="Bullet List" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <List className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('insertOrderedList')} title="Numbered List" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <ListOrdered className="h-4 w-4" />
        </button>

        <span className="shrink-0 w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => format('justifyLeft')} title="Align Left" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('justifyCenter')} title="Align Center" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('justifyRight')} title="Align Right" className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <AlignRight className="h-4 w-4" />
        </button>

        <span className="shrink-0 w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={insertCallout}
          className="shrink-0 flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-semibold text-xs transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" /> Callout Box
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[200px] sm:min-h-[220px] p-3 sm:p-4 text-gray-800 text-xs sm:text-sm focus:outline-none prose max-w-none font-sans break-words overflow-x-auto max-w-full [word-break:break-word]"
      />
    </div>
  )
}

export default function AdminBatchDetails() {
  const { user } = useAuth()
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Batch Form State
  const [detailedInfo, setDetailedInfo] = useState('')
  const [facultyImages, setFacultyImages] = useState([])

  // Study Cards State for Selected Batch
  const [studyCards, setStudyCards] = useState([])
  const [batchChapters, setBatchChapters] = useState([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardForm, setCardForm] = useState({
    title: '', description: '', type: 'youtube_video', url: '', subject: '', chapter: '', chapter_id: null, is_public: true, is_featured: false
  })
  const [savingCard, setSavingCard] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [notesModalCard, setNotesModalCard] = useState(null)

  // Featured Lectures on Public Landing Page State
  const [featuredCards, setFeaturedCards] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [eligibleCards, setEligibleCards] = useState([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [featureSearch, setFeatureSearch] = useState('')
  const [reordering, setReordering] = useState(false)

  // Load batches and featured cards on mount
  useEffect(() => {
    fetchFeaturedCards()
    supabase.from('batches').select('id, name, subject, subjects, poster_url, detailed_info, faculty_images').order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          setBatches(data)
          if (data.length > 0) {
            loadBatchData(data[0])
          }
        }
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFeaturedCards = async () => {
    setLoadingFeatured(true)
    const { data, error } = await supabase.from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order', { ascending: true })

    if (!error && data) {
      setFeaturedCards(data)
    }
    setLoadingFeatured(false)
  }

  const handleMoveFeatured = async (index, direction) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= featuredCards.length || reordering) return
    setReordering(true)

    const list = [...featuredCards]
    const currentCard = list[index]
    const swapCard = list[targetIdx]

    // Swap positions locally
    list[index] = swapCard
    list[targetIdx] = currentCard

    // Assign sequential display_order
    const updatedWithOrder = list.map((c, i) => ({ ...c, display_order: i + 1 }))
    setFeaturedCards(updatedWithOrder)

    try {
      await Promise.all([
        supabase.from('study_cards').update({ display_order: targetIdx + 1 }).eq('id', currentCard.id),
        supabase.from('study_cards').update({ display_order: index + 1 }).eq('id', swapCard.id)
      ])
      toast.success('Landing carousel position updated')
    } catch (err) {
      toast.error('Failed to save order: ' + err.message)
      fetchFeaturedCards()
    } finally {
      setReordering(false)
    }
  }

  const handleUnfeature = async (card) => {
    const { error } = await supabase.from('study_cards')
      .update({ is_featured: false })
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to unfeature: ' + error.message)
    } else {
      toast.success(`"${card.title}" removed from Featured Spotlight`)
      setFeaturedCards(prev => prev.filter(c => c.id !== card.id))
      setStudyCards(prev => prev.map(c => c.id === card.id ? { ...c, is_featured: false } : c))
      logActivity({
        batchId: selectedBatchId,
        user,
        userName: user?.user_metadata?.full_name || 'Admin',
        userRole: 'admin',
        actionType: 'update',
        entityTitle: card.title,
        details: 'Removed lecture from public landing page spotlight'
      })
    }
  }

  const openFeatureModal = async () => {
    setShowFeatureModal(true)
    setLoadingEligible(true)
    setFeatureSearch('')
    const { data, error } = await supabase.from('study_cards')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setEligibleCards(data.filter(c => !c.is_featured))
    }
    setLoadingEligible(false)
  }

  const handleFeatureCard = async (card) => {
    const nextOrder = featuredCards.length > 0
      ? Math.max(...featuredCards.map(c => c.display_order || 0)) + 1
      : 1

    const { error } = await supabase.from('study_cards')
      .update({ is_featured: true, is_public: true, display_order: nextOrder })
      .eq('id', card.id)

    if (error) {
      toast.error('Failed to feature card: ' + error.message)
    } else {
      toast.success(`"${card.title}" added to Landing Page Spotlight!`)
      setShowFeatureModal(false)
      fetchFeaturedCards()
      setStudyCards(prev => prev.map(c => c.id === card.id ? { ...c, is_featured: true, is_public: true } : c))
      logActivity({
        batchId: selectedBatchId,
        user,
        userName: user?.user_metadata?.full_name || 'Admin',
        userRole: 'admin',
        actionType: 'update',
        entityTitle: card.title,
        details: 'Added lecture to public landing page spotlight'
      })
    }
  }

  const loadBatchData = (batch) => {
    setSelectedBatchId(batch.id)
    setDetailedInfo(batch.detailed_info || '')
    setFacultyImages(Array.isArray(batch.faculty_images) ? batch.faculty_images : [])
    fetchBatchStudyCards(batch.id)
    fetchBatchChapters(batch.id)
  }

  const fetchBatchChapters = async (batchId) => {
    try {
      const { data } = await supabase.from('chapters')
        .select('*')
        .or(`batch_id.is.null,batch_id.eq.${batchId}`)
        .order('display_order')
      setBatchChapters(data || [])
    } catch {
      setBatchChapters([])
    }
  }

  const fetchBatchStudyCards = async (batchId) => {
    setLoadingCards(true)
    const { data, error } = await supabase.from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('display_order')

    if (error) {
      toast.error(error.message)
    } else if (data) {
      // Filter public cards specifically assigned to this batch
      const matched = data.filter(c => 
        (Array.isArray(c.batch_ids) && c.batch_ids.includes(batchId)) || 
        c.batch_id === batchId
      )
      setStudyCards(matched)
    }
    setLoadingCards(false)
  }

  const handleBatchSelect = (batchId) => {
    const found = batches.find(b => b.id === batchId)
    if (found) loadBatchData(found)
  }

  // Faculty Handlers
  const addFaculty = () => {
    setFacultyImages(prev => [...prev, { name: '', subject: '', image_url: '' }])
  }
  const updateFaculty = (index, field, val) => {
    setFacultyImages(prev => prev.map((f, i) => i === index ? { ...f, [field]: val } : f))
  }
  const removeFaculty = (index) => {
    setFacultyImages(prev => prev.filter((_, i) => i !== index))
  }

  // Save Batch Details
  const saveBatchDetails = async () => {
    if (!selectedBatchId) {
      toast.error('Please select a batch first')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('batches').update({
      detailed_info: detailedInfo,
      faculty_images: facultyImages,
    }).eq('id', selectedBatchId)

    setSaving(false)

    if (error) {
      toast.error('Error saving: ' + error.message)
    } else {
      toast.success('Batch details updated successfully!')
      setBatches(prev => prev.map(b => b.id === selectedBatchId ? {
        ...b,
        detailed_info: detailedInfo,
        faculty_images: facultyImages,
      } : b))
    }
  }

  // Remove card from Public Batch Page (sets is_public: false)
  const handleRemoveFromPublic = async (card) => {
    const { error } = await supabase.from('study_cards').update({ is_public: false }).eq('id', card.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Removed from Public Batch Details page')
      setStudyCards(prev => prev.filter(c => c.id !== card.id))
      logActivity({
        batchId: selectedBatchId,
        user,
        userName: user?.user_metadata?.full_name || 'Admin',
        userRole: 'admin',
        actionType: 'toggle_visibility',
        entityTitle: card.title,
        details: 'Card Hidden from Public Batch Details page'
      })
    }
  }


  const handleCreatePublicCard = async () => {
    if (!cardForm.title.trim() || !cardForm.url.trim()) {
      toast.error('Title and Video URL are required')
      return
    }

    const trimmedUrl = cardForm.url.trim()
    const listId = getYTPlaylistId(trimmedUrl)
    const effectiveType = (cardForm.type === 'youtube_video' && listId) ? 'youtube_playlist' : cardForm.type
    let thumb = getYTThumb(trimmedUrl)

    if (!thumb && (effectiveType === 'youtube_playlist' || listId)) {
      try {
        const oembed = await fetchYouTubeOEmbed(trimmedUrl)
        if (oembed?.thumbnail_url) {
          thumb = oembed.thumbnail_url
        }
      } catch {
        // Fallback
      }
    }

    setSavingCard(true)

    let chId = cardForm.chapter_id || null
    let chTitle = cardForm.chapter?.trim() || null

    if (chTitle && !chId) {
      const matched = batchChapters.find(ch =>
        ch.title?.trim().toLowerCase() === chTitle.toLowerCase() &&
        (!cardForm.subject || ch.subject?.toLowerCase() === cardForm.subject.trim().toLowerCase())
      )
      if (matched) {
        chId = matched.id
        chTitle = matched.title
      }
    } else if (chId) {
      const matched = batchChapters.find(ch => ch.id === chId)
      if (matched) chTitle = matched.title
    }

    const payload = {
      title: cardForm.title.trim(),
      description: cardForm.description?.trim() || null,
      type: effectiveType,
      url: trimmedUrl,
      thumbnail_url: thumb || null,
      subject: cardForm.subject?.trim() || null,
      chapter: chTitle,
      chapter_id: chId,
      is_public: cardForm.is_public,
      is_featured: Boolean(cardForm.is_featured),
      batch_id: selectedBatchId,
      batch_ids: [selectedBatchId],
      is_active: true,
      added_by: user?.id || null,
    }

    let { data, error } = await supabase.from('study_cards').insert(payload).select().maybeSingle()

    // Resilient fallback if chapter column does not exist yet on remote database
    if (error && (error.code === '42703' || error.message?.includes('chapter'))) {
      const cleanPayload = { ...payload }
      delete cleanPayload.chapter
      delete cleanPayload.chapter_id
      const retryResult = await supabase.from('study_cards').insert(cleanPayload).select().maybeSingle()
      data = retryResult.data
      error = retryResult.error
    }

    setSavingCard(false)

    if (error) {
      toast.error('Failed to add study card: ' + error.message)
    } else {
      toast.success('Public Study Card added!')
      setShowCardModal(false)
      setCardForm({ title: '', description: '', type: 'youtube_video', url: '', subject: '', chapter: '', chapter_id: null, is_public: true, is_featured: false })
      if (data) {
        setStudyCards(prev => [data, ...prev])
        if (data.is_featured) {
          fetchFeaturedCards()
        }
        logActivity({
          batchId: selectedBatchId,
          user,
          userName: user?.user_metadata?.full_name || 'Admin',
          userRole: 'admin',
          actionType: 'create',
          entityTitle: data.title,
          details: `Subject: ${data.subject || 'General'} | Added from Admin Batch Details`
        })
      }
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId)

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading batches…</div>

  return (
    <div className="space-y-5 sm:space-y-6 pb-36 sm:pb-36 lg:pb-8 max-w-5xl mx-auto w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200 shadow-sm min-w-0 max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-blue-900 shrink-0" />
            <span className="truncate">Batch Details Editor</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Configure rich info, faculty profiles, and manage public study card videos for this batch.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0 min-w-0">
          {selectedBatchId && (
            <Link
              to={`/batch-details?id=${selectedBatchId}`}
              target="_blank"
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors min-w-0"
            >
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-900 shrink-0" />
              <span className="truncate">Preview Page</span>
            </Link>
          )}

          <button
            onClick={saveBatchDetails}
            disabled={saving}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer min-w-0"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
            <span className="truncate">Save Changes</span>
          </button>
        </div>
      </div>

      {/* Batch Select Box */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 min-w-0 max-w-full overflow-hidden">
        <label className="block text-xs sm:text-sm font-bold text-gray-900">Select Batch to Edit</label>
        <div className="min-w-0 w-full">
          <CustomSelect
            value={selectedBatchId}
            onChange={val => handleBatchSelect(val)}
            options={
              batches.length === 0
                ? [{ value: '', label: 'No batches found' }]
                : batches.map(b => ({
                    value: b.id,
                    label: `${b.name} ${b.subject ? `(${b.subject})` : ''}`
                  }))
            }
          />
        </div>
        {selectedBatchId && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-gray-100 gap-2.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs text-gray-500 font-medium shrink-0">Batch Security &amp; Audit Trail</span>
              {(() => {
                const badge = formatBatchFeeBadge(selectedBatch)
                return badge ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border truncate max-w-full ${badge.color}`}>
                    {badge.text}
                  </span>
                ) : null
              })()}
            </div>
            <button
              type="button"
              onClick={() => setShowActivityLog(true)}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>View 24h Activity Log</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: Rich Text Details */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3 sm:space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
            <span className="truncate">Detailed Batch Information</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Format curriculum breakdown, schedules, eligibility, or perks using the MS Office-style toolbar below.
          </p>
        </div>

        <RichTextEditor value={detailedInfo} onChange={setDetailedInfo} />
      </div>

      {/* SECTION 2: Faculty Images */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600 shrink-0" />
              <span className="truncate">Batch Faculty / Educators</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Add teacher profiles with Google Drive share links for photos (auto-converted to CDN).
            </p>
          </div>
          <button
            onClick={addFaculty}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Add Teacher</span>
          </button>
        </div>

        {facultyImages.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-500">No faculty members added yet.</p>
            <button onClick={addFaculty} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
              + Add first faculty member
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4 min-w-0">
            {facultyImages.map((fac, idx) => {
              return (
                <div key={idx} className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center relative min-w-0 max-w-full overflow-hidden">
                  {/* Avatar & Mobile Remove Header */}
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-2xl bg-indigo-100 shrink-0 overflow-hidden border-2 border-indigo-200 flex items-center justify-center shadow-xs">
                      {fac.image_url?.trim() ? (
                        <DriveImage
                          src={fac.image_url.trim()}
                          alt="Faculty"
                          className="w-full h-full object-cover"
                          fallback={<UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-400" />}
                        />
                      ) : (
                        <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-400" />
                      )}
                    </div>

                    {/* Mobile-only trash button */}
                    <button
                      type="button"
                      onClick={() => removeFaculty(idx)}
                      className="sm:hidden p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove Teacher"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Form Inputs */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0">
                    <div className="min-w-0">
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Teacher Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Subodh Verma"
                        value={fac.name}
                        onChange={e => updateFaculty(idx, 'name', e.target.value)}
                        className="w-full min-w-0 px-3 py-2 sm:py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Subject / Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Lead Educator (Physics)"
                        value={fac.subject}
                        onChange={e => updateFaculty(idx, 'subject', e.target.value)}
                        className="w-full min-w-0 px-3 py-2 sm:py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Google Drive Image Link</label>
                      <input
                        type="text"
                        placeholder="https://drive.google.com/file/d/..."
                        value={fac.image_url}
                        onChange={e => updateFaculty(idx, 'image_url', e.target.value)}
                        className="w-full min-w-0 px-3 py-2 sm:py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Desktop-only trash button */}
                  <button
                    type="button"
                    onClick={() => removeFaculty(idx)}
                    className="hidden sm:inline-flex p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors self-center shrink-0 cursor-pointer"
                    title="Remove Teacher"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Public Study Cards & Videos for this Batch */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
              <Video className="h-5 w-5 text-red-600 shrink-0" />
              <span className="truncate">Public Videos &amp; Study Cards for {selectedBatch?.name}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              These public study cards from your institute database are displayed on the public Batch Details page.
            </p>
          </div>
          <button
            onClick={() => setShowCardModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-colors shadow-xs w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Add Public Video Card</span>
          </button>
        </div>

        {loadingCards ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading public study cards…</div>
        ) : studyCards.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-500">No study cards linked to this batch yet.</p>
            <button onClick={() => setShowCardModal(true)} className="mt-2 text-xs font-bold text-red-600 hover:underline">
              + Add first public video card
            </button>
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            {studyCards.map(card => {
              const thumb = card.thumbnail_url || getYTThumb(card.url)
              return (
                <div key={card.id} className="p-3 sm:p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-10 sm:w-20 sm:h-12 bg-gray-900 rounded-lg overflow-hidden shrink-0 relative">
                      {thumb ? (
                        <img src={thumb} alt={card.title} className="w-full h-full object-cover" />
                      ) : card.type === 'google_drive' ? (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-amber-700" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50 text-[10px]">
                          Video
                        </div>
                      )}
                    </div>

                    {/* Card Title & Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <h3 className="font-bold text-gray-900 text-xs truncate leading-snug">{card.title}</h3>
                        {card.is_featured && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[9.5px]">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap min-w-0">
                        {card.subject && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px] shrink-0">
                            {card.subject}
                          </span>
                        )}
                        <span className="text-gray-400 capitalize text-[10.5px] truncate">{card.type?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60 min-w-0">
                    <button
                      type="button"
                      onClick={() => setNotesModalCard(card)}
                      className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer min-w-0 truncate"
                      title={card.type === 'youtube_playlist' ? 'Manage Notes Playlist' : 'Attach Notes & PDFs'}
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {card.type === 'youtube_playlist'
                          ? (card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Notes Playlist')
                          : (card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Attach Notes')}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRemoveFromPublic(card)}
                      className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                      title="Remove card from public batch page"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: Public Landing Page — Featured Lectures Window */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold tracking-wide uppercase shrink-0">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Curated Spotlight</span>
              </span>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="truncate">Landing Page Featured Lectures</span>
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                {featuredCards.length} {featuredCards.length === 1 ? 'Card' : 'Cards'} Live
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              These high-yield lessons appear in the top <strong>Featured lectures</strong> carousel on the public home page for all students.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 min-w-0">
            <Link
              to="/"
              target="_blank"
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors min-w-0"
              title="Preview Landing Page Carousel"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Preview Live Home</span>
            </Link>

            <button
              type="button"
              onClick={openFeatureModal}
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer min-w-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Feature a Lecture</span>
            </button>
          </div>
        </div>

        {/* Featured Lectures List */}
        {loadingFeatured ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading featured lectures…</div>
        ) : featuredCards.length === 0 ? (
          <div className="text-center py-8 bg-amber-50/40 rounded-xl border border-dashed border-amber-200">
            <Sparkles className="h-8 w-8 text-amber-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-amber-950">No lectures currently featured on the public landing page.</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Feature high-yield video cards to highlight them in the Curated Spotlight carousel.</p>
            <button
              type="button"
              onClick={openFeatureModal}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4 shrink-0" /> Feature your first lecture
            </button>
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            {featuredCards.map((card, idx) => {
              const thumb = card.thumbnail_url || getYTThumb(card.url)
              const batchName = batches.find(b => b.id === card.batch_id || (Array.isArray(card.batch_ids) && card.batch_ids.includes(b.id)))?.name || 'General'
              return (
                <div
                  key={card.id}
                  className="p-3 sm:p-3.5 bg-gradient-to-r from-gray-50 to-amber-50/30 rounded-xl border border-amber-200/70 hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-2xs min-w-0 max-w-full overflow-hidden"
                >
                  {/* Left: Rank & Thumbnail */}
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                    {/* Rank pill */}
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-mono font-bold text-xs shrink-0" title={`Carousel Position #${idx + 1}`}>
                      #{idx + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-16 h-10 sm:w-20 sm:h-12 bg-gray-900 rounded-lg overflow-hidden shrink-0 relative shadow-xs">
                      {thumb ? (
                        <img src={thumb} alt={card.title} className="w-full h-full object-cover" />
                      ) : card.type === 'google_drive' ? (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-amber-700" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50 text-[10px]">
                          Video
                        </div>
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          Featured
                        </span>
                        {card.subject && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 shrink-0">
                            {card.subject}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-gray-500 truncate max-w-[120px] sm:max-w-[140px]">
                          Batch: {batchName}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-xs truncate mt-1 leading-snug">{card.title}</h3>
                    </div>
                  </div>

                  {/* Actions & Ordering Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60 min-w-0 flex-wrap sm:flex-nowrap">
                    {/* Move Up/Down Controls */}
                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-gray-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveFeatured(idx, -1)}
                        disabled={idx === 0 || reordering}
                        className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                        title="Move Up in Carousel"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFeatured(idx, 1)}
                        disabled={idx === featuredCards.length - 1 || reordering}
                        className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                        title="Move Down in Carousel"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Notes Modal Button */}
                    <button
                      type="button"
                      onClick={() => setNotesModalCard(card)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer shrink-0"
                      title={card.type === 'youtube_playlist' ? 'Manage Notes Playlist' : 'Attach Notes & PDFs'}
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>
                        {card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Notes'}
                      </span>
                    </button>

                    {/* Watch / Open Button */}
                    <Link
                      to={`/watch/${card.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                      title="Open Lecture Watch View"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>Watch</span>
                    </Link>

                    {/* Unfeature Button */}
                    <button
                      type="button"
                      onClick={() => handleUnfeature(card)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                      title="Remove from Public Landing Carousel"
                    >
                      <X className="h-3.5 w-3.5 shrink-0" />
                      <span>Unfeature</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Public Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto min-w-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Video className="h-5 w-5 text-red-600 shrink-0" />
                <span className="truncate">Add Public Study Video Card</span>
              </h3>
              <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Physics Motion in 1D - One Shot"
                  value={cardForm.title}
                  onChange={e => setCardForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Video URL (YouTube or Google Drive) *</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or Google Drive link"
                  value={cardForm.url}
                  onChange={e => {
                    const val = e.target.value
                    const listId = getYTPlaylistId(val.trim())
                    setCardForm(f => ({
                      ...f,
                      url: val,
                      type: (listId && f.type === 'youtube_video') ? 'youtube_playlist' : f.type,
                    }))
                    if (listId && !cardForm.title.trim()) {
                      fetchYouTubeOEmbed(val.trim()).then(d => {
                        if (d?.title) {
                          setCardForm(f => ({ ...f, title: f.title || d.title }))
                        }
                      }).catch(() => {})
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Type</label>
                  <select
                    value={cardForm.type}
                    onChange={e => setCardForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="youtube_video">YouTube Video</option>
                    <option value="youtube_playlist">YouTube Playlist</option>
                    <option value="google_drive">Google Drive Video</option>
                    <option value="external_link">External Link</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics"
                    value={cardForm.subject}
                    onChange={e => setCardForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Chapter (Optional)</label>
                {batchChapters.filter(ch => !cardForm.subject || ch.subject?.toLowerCase() === cardForm.subject.trim().toLowerCase()).length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={cardForm.chapter_id || (cardForm.chapter ? '__custom__' : '')}
                      onChange={e => {
                        const val = e.target.value
                        if (val === '__custom__') {
                          setCardForm(f => ({ ...f, chapter_id: null }))
                        } else if (!val) {
                          setCardForm(f => ({ ...f, chapter_id: null, chapter: '' }))
                        } else {
                          const chosen = batchChapters.find(ch => ch.id === val)
                          setCardForm(f => ({ ...f, chapter_id: val, chapter: chosen?.title || '' }))
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none text-xs bg-white"
                    >
                      <option value="">None / General (No Chapter)</option>
                      {batchChapters
                        .filter(ch => !cardForm.subject || ch.subject?.toLowerCase() === cardForm.subject.trim().toLowerCase())
                        .map(ch => (
                          <option key={ch.id} value={ch.id}>{ch.title}</option>
                        ))}
                      <option value="__custom__">+ Custom Chapter Name...</option>
                    </select>
                    {(!cardForm.chapter_id && cardForm.chapter !== '') && (
                      <input
                        type="text"
                        placeholder="Type new chapter name..."
                        value={cardForm.chapter || ''}
                        onChange={e => setCardForm(f => ({ ...f, chapter: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none text-xs mt-1"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Electric Charges and Fields"
                    value={cardForm.chapter || ''}
                    onChange={e => setCardForm(f => ({ ...f, chapter: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none text-xs"
                  />
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public_check"
                    checked={cardForm.is_public}
                    onChange={e => setCardForm(f => ({ ...f, is_public: e.target.checked }))}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  <label htmlFor="is_public_check" className="font-bold text-gray-800 text-xs cursor-pointer">
                    Make Public (Show on Public Batch Details page)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured_check"
                    checked={cardForm.is_featured || false}
                    onChange={e => setCardForm(f => ({ ...f, is_featured: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <label htmlFor="is_featured_check" className="font-bold text-gray-800 text-xs flex items-center gap-1.5 cursor-pointer">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Feature in Spotlight on Public Landing Page Carousel</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowCardModal(false)}
                className="flex-1 py-2 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePublicCard}
                disabled={savingCard}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {savingCard ? 'Adding…' : 'Add Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature a Lecture Modal */}
      {showFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col min-w-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                  <span className="truncate">Feature a Study Card on Landing Page</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select an existing study card from your library to feature in the Curated Spotlight carousel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeatureModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search lectures by title or subject..."
                value={featureSearch}
                onChange={e => setFeatureSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Eligible Cards List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] min-w-0">
              {loadingEligible ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading study cards…</div>
              ) : eligibleCards.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  All active public cards are already featured, or none found.
                </div>
              ) : (
                eligibleCards
                  .filter(c =>
                    !featureSearch.trim() ||
                    c.title?.toLowerCase().includes(featureSearch.toLowerCase()) ||
                    c.subject?.toLowerCase().includes(featureSearch.toLowerCase())
                  )
                  .map(card => {
                    const thumb = card.thumbnail_url || getYTThumb(card.url)
                    const batchName = batches.find(b => b.id === card.batch_id || (Array.isArray(card.batch_ids) && card.batch_ids.includes(b.id)))?.name || 'General'
                    return (
                      <div
                        key={card.id}
                        className="p-2.5 sm:p-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/20 transition-all flex items-center justify-between gap-2.5 sm:gap-3 min-w-0"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className="w-14 h-9 bg-gray-900 rounded-lg overflow-hidden shrink-0 relative">
                            {thumb ? (
                              <img src={thumb} alt={card.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/40 text-[9px]">
                                Video
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-900 text-xs truncate leading-snug">{card.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 min-w-0">
                              {card.subject && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold shrink-0">
                                  {card.subject}
                                </span>
                              )}
                              <span className="truncate">Batch: {batchName}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFeatureCard(card)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                        >
                          Feature Card
                        </button>
                      </div>
                    )
                  })
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs min-w-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFeatureModal(false)
                  setShowCardModal(true)
                }}
                className="text-amber-700 hover:underline font-bold text-xs truncate"
              >
                + Or Create Brand New Card
              </button>
              <button
                type="button"
                onClick={() => setShowFeatureModal(false)}
                className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24-Hour Batch Activity Log Modal */}
      {showActivityLog && selectedBatchId && (
        <ActivityLogModal
          batchId={selectedBatchId}
          batchName={batches.find(b => b.id === selectedBatchId)?.name}
          onClose={() => setShowActivityLog(false)}
        />
      )}

      {/* Notes Playlist Modal */}
      {notesModalCard && (
        <NotesPlaylistModal
          isOpen={Boolean(notesModalCard)}
          onClose={() => setNotesModalCard(null)}
          card={notesModalCard}
          onSaveSuccess={(updated) => {
            setStudyCards(prev => prev.map(c => c.id === updated.id ? updated : c))
            setFeaturedCards(prev => prev.map(c => c.id === updated.id ? updated : c))
            setNotesModalCard(null)
          }}
        />
      )}
    </div>
  )
}
