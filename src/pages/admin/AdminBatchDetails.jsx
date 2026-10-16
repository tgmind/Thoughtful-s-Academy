import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Save, Plus, Trash2,
  Image as ImageIcon, Video, UserCheck, Sparkles, RefreshCw, ExternalLink, X, Clock,
  FileText
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
    <div className={`rounded-xl border transition-all ${isFocused ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 rounded-t-xl text-gray-700 text-sm">
        <button type="button" onClick={() => format('bold')} title="Bold" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('italic')} title="Italic" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('underline')} title="Underline" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('strikeThrough')} title="Strikethrough" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <Strikethrough className="h-4 w-4" />
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => format('formatBlock', '<h1>')} title="Heading 1" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-xs">
          H1
        </button>
        <button type="button" onClick={() => format('formatBlock', '<h2>')} title="Heading 2" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-xs">
          H2
        </button>
        <button type="button" onClick={() => format('formatBlock', '<h3>')} title="Heading 3" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold text-xs">
          H3
        </button>
        <button type="button" onClick={() => format('formatBlock', '<p>')} title="Paragraph" className="p-1.5 rounded hover:bg-gray-200 text-gray-700 text-xs">
          Paragraph
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <select
          onChange={(e) => format('foreColor', e.target.value)}
          className="h-8 px-1.5 text-xs rounded border border-gray-200 bg-white"
          title="Text Color"
        >
          <option value="#1e293b">Dark Text</option>
          <option value="#2563eb">Royal Blue</option>
          <option value="#059669">Emerald Green</option>
          <option value="#d97706">Amber Gold</option>
          <option value="#dc2626">Crimson Red</option>
          <option value="#7c3aed">Deep Purple</option>
        </select>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => format('insertUnorderedList')} title="Bullet List" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <List className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('insertOrderedList')} title="Numbered List" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <ListOrdered className="h-4 w-4" />
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => format('justifyLeft')} title="Align Left" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('justifyCenter')} title="Align Center" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => format('justifyRight')} title="Align Right" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <AlignRight className="h-4 w-4" />
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={insertCallout}
          className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-semibold text-xs transition-colors"
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
        className="min-h-[220px] p-4 text-gray-800 text-sm focus:outline-none prose max-w-none font-sans"
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
    title: '', description: '', type: 'youtube_video', url: '', subject: '', chapter: '', chapter_id: null, is_public: true
  })
  const [savingCard, setSavingCard] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [notesModalCard, setNotesModalCard] = useState(null)

  // Load batches on mount
  useEffect(() => {
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
      setCardForm({ title: '', description: '', type: 'youtube_video', url: '', subject: '', chapter: '', chapter_id: null, is_public: true })
      if (data) {
        setStudyCards(prev => [data, ...prev])
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
    <div className="space-y-6 pb-20 lg:pb-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-900" /> Batch Details Editor
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure rich info, faculty profiles, and manage public study card videos for this batch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedBatchId && (
            <Link
              to={`/batch-details?id=${selectedBatchId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-blue-900" /> Preview Page
            </Link>
          )}

          <button
            onClick={saveBatchDetails}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Batch Select Box */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <label className="block text-sm font-bold text-gray-900">Select Batch to Edit</label>
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
        {selectedBatchId && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-wrap gap-2">
            <span className="text-xs text-gray-500 font-medium">Batch Security & Audit Trail</span>
            <button
              type="button"
              onClick={() => setShowActivityLog(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>View 24h Activity Log</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: Rich Text Details */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" /> Detailed Batch Information
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Format curriculum breakdown, schedules, eligibility, or perks using the MS Office-style toolbar below.
          </p>
        </div>

        <RichTextEditor value={detailedInfo} onChange={setDetailedInfo} />
      </div>

      {/* SECTION 2: Faculty Images */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" /> Batch Faculty / Educators
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add teacher profiles with Google Drive share links for photos (auto-converted to CDN).
            </p>
          </div>
          <button
            onClick={addFaculty}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Teacher
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
          <div className="space-y-4">
            {facultyImages.map((fac, idx) => {
              return (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-100 flex-shrink-0 overflow-hidden border-2 border-indigo-200 flex items-center justify-center shadow-xs">
                    {fac.image_url?.trim() ? (
                      <DriveImage
                        src={fac.image_url.trim()}
                        alt="Faculty"
                        className="w-full h-full object-cover"
                        fallback={<UserCheck className="h-8 w-8 text-indigo-400" />}
                      />
                    ) : (
                      <UserCheck className="h-8 w-8 text-indigo-400" />
                    )}
                  </div>


                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Teacher Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Subodh Verma"
                        value={fac.name}
                        onChange={e => updateFaculty(idx, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Subject / Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Lead Educator (Physics)"
                        value={fac.subject}
                        onChange={e => updateFaculty(idx, 'subject', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Google Drive Image Link</label>
                      <input
                        type="text"
                        placeholder="https://drive.google.com/file/d/..."
                        value={fac.image_url}
                        onChange={e => updateFaculty(idx, 'image_url', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeFaculty(idx)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors self-end sm:self-center"
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
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Video className="h-5 w-5 text-red-600" /> Public Videos &amp; Study Cards for {selectedBatch?.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              These public study cards from your institute database are displayed on the public Batch Details page.
            </p>
          </div>
          <button
            onClick={() => setShowCardModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Public Video Card
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
          <div className="space-y-3">
            {studyCards.map(card => {
              const thumb = card.thumbnail_url || getYTThumb(card.url)
              return (
                <div key={card.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-12 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative">
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
                    <h3 className="font-bold text-gray-900 text-xs truncate">{card.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      {card.subject && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          {card.subject}
                        </span>
                      )}
                      <span className="text-gray-400 capitalize">{card.type?.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setNotesModalCard(card)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                      title={card.type === 'youtube_playlist' ? 'Manage Notes Playlist' : 'Attach Notes & PDFs'}
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {card.type === 'youtube_playlist'
                          ? (card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Notes Playlist')
                          : (card.attached_notes?.length > 0 ? `Notes (${card.attached_notes.length})` : 'Attach Notes')}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRemoveFromPublic(card)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Remove card from public batch page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Video className="h-5 w-5 text-red-600" /> Add Public Study Video Card
              </h3>
              <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600">
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_public_check"
                  checked={cardForm.is_public}
                  onChange={e => setCardForm(f => ({ ...f, is_public: e.target.checked }))}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <label htmlFor="is_public_check" className="font-bold text-gray-800 text-xs">
                  Make Public (Show on Public Batch Details page)
                </label>
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
            setNotesModalCard(null)
          }}
        />
      )}
    </div>
  )
}
