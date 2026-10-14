import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  CheckCircle2,
  Sparkles,
  Link2,
  ExternalLink,
  X,
  ListPlus,
  Save,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { resolveYouTubeMedia, fetchPlaylistItems } from '../../utils/youtube'
import { parseGoogleResource, isGoogleDriveResource } from '../../utils/materialUrl'
import MaterialViewerModal from './MaterialViewerModal'

const NOTE_TAGS = [
  'Full Chapter Notes',
  'Formula Sheet',
  'Practice Sheet',
  'NCERT Solutions',
  'Handwritten Notes',
  'Question Bank',
  'Reference Material'
]

/**
 * NotesPlaylistModal
 * Industry-grade modal for educators & administrators to attach single/multiple
 * Google Drive notes & build structured Notes Playlists for study cards.
 */
export default function NotesPlaylistModal({
  isOpen,
  onClose,
  card,
  onSaveSuccess
}) {
  const isPlaylist = card?.type === 'youtube_playlist' || resolveYouTubeMedia(card?.url, card?.thumbnail_url, card?.type).isPlaylist

  const [notes, setNotes] = useState([])
  const [saving, setSaving] = useState(false)
  const [curriculumLoading, setCurriculumLoading] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [previewNote, setPreviewNote] = useState(null)

  // Initialize attached notes from card
  useEffect(() => {
    if (card?.attached_notes && Array.isArray(card.attached_notes)) {
      setNotes(card.attached_notes.map((n, idx) => ({
        id: n.id || `note_${Date.now()}_${idx}`,
        title: n.title || `Note #${idx + 1}`,
        url: n.url || '',
        tag: n.tag || 'Full Chapter Notes',
        lecture_index: typeof n.lecture_index === 'number' ? n.lecture_index : (isPlaylist ? idx + 1 : null),
        description: n.description || ''
      })))
    } else {
      setNotes([])
    }
  }, [card, isPlaylist])

  if (!isOpen || !card) return null

  // 1. Add single note slot
  const handleAddNote = () => {
    const nextIdx = notes.length + 1
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: isPlaylist ? `Lecture #${nextIdx} Notes` : (notes.length === 0 ? `${card.title} - Notes` : `Reference Note #${nextIdx}`),
      url: '',
      tag: 'Full Chapter Notes',
      lecture_index: isPlaylist ? nextIdx : null,
      description: ''
    }
    setNotes(prev => [...prev, newNote])
  }

  // 2. Update note field
  const handleUpdateNote = (id, field, value) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
  }

  // 3. Remove note
  const handleRemoveNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // 4. Move note position
  const handleMoveNote = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= notes.length) return
    const updated = [...notes]
    const temp = updated[idx]
    updated[idx] = updated[targetIdx]
    updated[targetIdx] = temp
    setNotes(updated)
  }

  // 5. Auto-Generate Slots from Video Curriculum (for playlists)
  const handleSyncFromCurriculum = async () => {
    const { playlistId, videoId } = resolveYouTubeMedia(card.url, card.thumbnail_url, card.type)
    if (!playlistId && !videoId) {
      toast.error('No playlist ID detected for this card')
      return
    }

    setCurriculumLoading(true)
    try {
      const items = await fetchPlaylistItems(playlistId, videoId, card.title)
      if (!items || items.length === 0) {
        toast.error('Could not fetch curriculum items from playlist')
        return
      }

      // Generate or merge slots for each lecture item
      const generated = items.map((item, idx) => {
        const existing = notes.find(n => n.lecture_index === idx + 1)
        return existing || {
          id: `note_auto_${Date.now()}_${idx}`,
          title: `Lecture #${idx + 1} Notes: ${item.title.substring(0, 60)}`,
          url: '',
          tag: 'Full Chapter Notes',
          lecture_index: idx + 1,
          description: `Handwritten notes for Lecture #${idx + 1}`
        }
      })

      setNotes(generated)
      toast.success(`Generated ${generated.length} notes playlist slots matching course curriculum!`)
    } catch (err) {
      console.error('Error syncing curriculum:', err)
      toast.error('Failed to sync playlist curriculum')
    } finally {
      setCurriculumLoading(false)
    }
  }

  // 6. Bulk Link Parsing
  const handleApplyBulkLinks = () => {
    if (!bulkText.trim()) {
      setBulkMode(false)
      return
    }

    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    const newItems = []

    lines.forEach((line, idx) => {
      // Check if line contains a URL
      const urlMatch = line.match(/https?:\/\/[^\s]+/i)
      const url = urlMatch ? urlMatch[0] : ''
      let title = line.replace(url, '').trim().replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim()
      if (!title) {
        title = isPlaylist ? `Lecture #${notes.length + idx + 1} Notes` : `Reference Note #${notes.length + idx + 1}`
      }

      newItems.push({
        id: `note_bulk_${Date.now()}_${idx}`,
        title,
        url,
        tag: 'Full Chapter Notes',
        lecture_index: isPlaylist ? notes.length + idx + 1 : null,
        description: ''
      })
    })

    setNotes(prev => [...prev, ...newItems])
    setBulkText('')
    setBulkMode(false)
    toast.success(`Added ${newItems.length} notes from bulk import!`)
  }

  // 7. Save to Supabase
  const handleSave = async () => {
    // Basic validation
    const hasInvalidUrl = notes.some(n => n.url && !n.url.startsWith('http'))
    if (hasInvalidUrl) {
      toast.error('Please ensure all entered links are valid URLs (starting with https://)')
      return
    }

    // Filter out completely blank rows
    const cleanedNotes = notes.filter(n => n.title.trim() || n.url.trim()).map((n, idx) => ({
      ...n,
      title: n.title.trim() || (isPlaylist ? `Lecture #${idx + 1} Notes` : `Note #${idx + 1}`),
      url: n.url.trim(),
      lecture_index: isPlaylist ? (typeof n.lecture_index === 'number' ? n.lecture_index : idx + 1) : null
    }))

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('study_cards')
        .update({ attached_notes: cleanedNotes })
        .eq('id', card.id)
        .select()
        .maybeSingle()

      if (error) throw error

      toast.success(isPlaylist ? 'Notes Playlist Saved!' : 'Attached Notes Updated!')
      onSaveSuccess?.(data || { ...card, attached_notes: cleanedNotes })
      onClose()
    } catch (err) {
      console.error('Failed to save attached notes:', err)
      toast.error(err.message || 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-playlist-modal-title"
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 animate-scale-in">
        
        {/* ─── MODAL HEADER (Modern Grey-White Palette) ───────────────────── */}
        <header className="px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {isPlaylist ? 'Notes Playlist Builder' : 'Attach Notes & PDFs'}
                </span>
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                </span>
              </div>
              <h2 id="notes-playlist-modal-title" className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
                {card.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* ─── ACTION TOOLBAR ────────────────────────────────────────────── */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddNote}
              className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-amber-400 dark:text-amber-600" />
              <span>Add Note</span>
            </button>

            {isPlaylist && (
              <button
                type="button"
                onClick={handleSyncFromCurriculum}
                disabled={curriculumLoading}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Automatically fetch YouTube playlist lectures and create matching note slots"
              >
                {curriculumLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span>Sync from Playlist</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setBulkMode(b => !b)}
              className={`px-3 py-1.5 border text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                bulkMode
                  ? 'bg-amber-500 border-amber-600 text-slate-950 font-black'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <ListPlus className="h-3.5 w-3.5" />
              <span>Bulk Paste</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Paste Google Drive links or direct PDF links
          </span>
        </div>

        {/* ─── BULK PASTE DRAWER (EXPANDABLE) ────────────────────────────── */}
        {bulkMode && (
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 space-y-2 animate-fade-in shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-amber-600" /> Bulk Paste Note Links
              </span>
              <span className="text-[11px] text-amber-800/80 dark:text-amber-300">
                Format: <code>Lecture Title - https://drive.google.com/...</code> or just URLs
              </span>
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={4}
              placeholder={`Sound Lecture 1 Notes - https://drive.google.com/file/d/1ABC.../view\nSound Formula Sheet - https://drive.google.com/file/d/1XYZ.../view`}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkMode(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkLinks}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs cursor-pointer"
              >
                Import Notes
              </button>
            </div>
          </div>
        )}

        {/* ─── NOTES PLAYLIST LIST CONTAINER ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          {notes.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isPlaylist ? 'No Notes Added to this Playlist Yet' : 'No Notes Attached Yet'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {isPlaylist
                    ? 'Create note cards for each lecture in your syllabus or sync automatically from YouTube!'
                    : 'Attach chapter handwritten notes, formula sheets, or practice workbooks.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm cursor-pointer hover:opacity-90"
                >
                  + Add First Note
                </button>
                {isPlaylist && (
                  <button
                    type="button"
                    onClick={handleSyncFromCurriculum}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                  >
                    Auto-Sync from Playlist
                  </button>
                )}
              </div>
            </div>
          ) : (
            notes.map((note, idx) => {
              const isDrive = isGoogleDriveResource(note.url)
              const googleInfo = parseGoogleResource(note.url)
              const hasUrl = Boolean(note.url?.trim())

              return (
                <div
                  key={note.id}
                  className="group bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center gap-3 relative"
                >
                  {/* Left: Index badge & Reorder arrows */}
                  <div className="flex md:flex-col items-center gap-1 shrink-0">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-300 select-none">
                      #{idx + 1}
                    </span>
                    <div className="flex md:flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveNote(idx, -1)}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveNote(idx, 1)}
                        disabled={idx === notes.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Center: Note Form Fields */}
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    
                    {/* Note Title */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Note Title *
                      </label>
                      <input
                        type="text"
                        value={note.title}
                        onChange={(e) => handleUpdateNote(note.id, 'title', e.target.value)}
                        placeholder="e.g. Chapter 1 Handwritten Notes"
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>

                    {/* Category Tag */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Tag / Type
                      </label>
                      <select
                        value={note.tag}
                        onChange={(e) => handleUpdateNote(note.id, 'tag', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                      >
                        {NOTE_TAGS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Lecture Index Mapping (if playlist) */}
                    {isPlaylist && (
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Lecture Match
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={note.lecture_index ?? ''}
                          onChange={(e) => handleUpdateNote(note.id, 'lecture_index', e.target.value ? parseInt(e.target.value, 10) : null)}
                          placeholder="Lecture #"
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>
                    )}

                    {/* Google Drive / PDF URL */}
                    <div className="sm:col-span-12 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Google Drive / PDF URL *
                        </label>
                        {hasUrl && (
                          isDrive ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Google Drive File ID: {googleInfo.id ? googleInfo.id.substring(0, 8) + '…' : 'Valid'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> External Resource
                            </span>
                          )
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="url"
                          value={note.url}
                          onChange={(e) => handleUpdateNote(note.id, 'url', e.target.value)}
                          placeholder="https://drive.google.com/file/d/1IGQw9ZiZlzAFHwXgiQnpOL7mCiDJethI/view?usp=drivesdk"
                          className={`w-full pl-3 pr-24 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                            hasUrl && isDrive
                              ? 'border-emerald-300 dark:border-emerald-700/60 focus:ring-emerald-500/30'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/40'
                          }`}
                        />
                        {/* Test Preview Button inside input */}
                        {hasUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewNote(note)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-bold rounded-lg transition-all text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                            title="Test open with in-app PDF reader"
                          >
                            <Eye className="h-3 w-3 text-amber-500" /> Test
                          </button>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right: Delete button */}
                  <div className="flex items-center md:flex-col justify-end gap-1 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveNote(note.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Remove note"
                      aria-label="Remove note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              )
            })
          )}
        </div>

        {/* ─── MODAL FOOTER ──────────────────────────────────────────────── */}
        <footer className="px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">{notes.length}</span> items in playlist
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Notes
                </>
              )}
            </button>
          </div>
        </footer>

      </div>

      {/* In-Place Material Viewer Modal */}
      {previewNote && (
        <MaterialViewerModal
          card={{
            id: previewNote.id,
            title: previewNote.title,
            subject: card?.subject,
            url: previewNote.url,
            type: 'google_drive'
          }}
          onClose={() => setPreviewNote(null)}
        />
      )}
    </div>,
    document.body
  )
}
