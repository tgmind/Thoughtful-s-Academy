import React, { useState, useEffect } from 'react'
import {
  Share2, Plus, Edit2, Trash2, ExternalLink, Check, X,
  RefreshCw, Globe, ArrowUpDown, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchAllSocialLinksAdmin,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink
} from '../../services/socialLinksService'
import { PlatformIcon, getPlatformTheme } from '../home/SocialMediaButtons'

const SUPPORTED_PLATFORMS = [
  { id: 'youtube',   label: 'YouTube' },
  { id: 'whatsapp',  label: 'WhatsApp' },
  { id: 'telegram',  label: 'Telegram' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'playstore', label: 'Google Play Store' },
  { id: 'facebook',  label: 'Facebook' },
  { id: 'twitter',   label: 'X / Twitter' },
  { id: 'linkedin',  label: 'LinkedIn' },
  { id: 'discord',   label: 'Discord' },
  { id: 'other',     label: 'Custom Website / Other' },
]

export default function SocialLinksManager() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    platform: 'youtube',
    title: '',
    url: '',
    display_order: 1,
    is_active: true,
  })

  // Delete confirmation modal state
  const [deletingItem, setDeletingItem] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchAllSocialLinksAdmin()
      setLinks(data)
    } catch (err) {
      toast.error('Failed to load social links: ' + (err.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAdd = () => {
    setEditingItem(null)
    const nextOrder = links.length > 0 ? Math.max(...links.map(l => l.display_order || 0)) + 1 : 1
    setFormData({
      platform: 'youtube',
      title: 'YouTube',
      url: 'https://',
      display_order: nextOrder,
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormData({
      platform: item.platform || 'other',
      title: item.title || '',
      url: item.url || '',
      display_order: item.display_order ?? 1,
      is_active: item.is_active ?? true,
    })
    setIsModalOpen(true)
  }

  const handlePlatformChange = (newPlatform) => {
    const found = SUPPORTED_PLATFORMS.find(p => p.id === newPlatform)
    setFormData(prev => ({
      ...prev,
      platform: newPlatform,
      // Auto-suggest platform title if empty or matching a default platform label
      title: (!prev.title || SUPPORTED_PLATFORMS.some(p => p.label === prev.title))
        ? (found?.label || 'Social Link')
        : prev.title
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Please enter a display title')
      return
    }
    if (!formData.url.trim() || formData.url.trim() === 'https://') {
      toast.error('Please enter a valid destination URL')
      return
    }

    try {
      setSaving(true)
      if (editingItem) {
        const updated = await updateSocialLink(editingItem.id, formData)
        setLinks(prev => prev.map(l => (l.id === editingItem.id ? updated : l)).sort((a,b) => (a.display_order - b.display_order)))
        toast.success(`Updated "${formData.title}"`)
      } else {
        const created = await createSocialLink(formData)
        setLinks(prev => [...prev, created].sort((a,b) => (a.display_order - b.display_order)))
        toast.success(`Added "${formData.title}"`)
      }
      setIsModalOpen(false)
    } catch (err) {
      toast.error('Save failed: ' + (err.message || 'Error'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (item) => {
    const nextState = !item.is_active
    try {
      // Optimistic update
      setLinks(prev => prev.map(l => l.id === item.id ? { ...l, is_active: nextState } : l))
      await updateSocialLink(item.id, { is_active: nextState })
      toast.success(`${item.title} ${nextState ? 'shown on public page' : 'hidden from public page'}`)
    } catch (err) {
      // Rollback
      setLinks(prev => prev.map(l => l.id === item.id ? { ...l, is_active: !nextState } : l))
      toast.error('Failed to update status')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    try {
      setSaving(true)
      await deleteSocialLink(deletingItem.id)
      setLinks(prev => prev.filter(l => l.id !== deletingItem.id))
      toast.success(`Deleted "${deletingItem.title}"`)
      setDeletingItem(null)
    } catch (err) {
      toast.error('Delete failed: ' + (err.message || 'Error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      {/* ── Section Header ── */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Social Media &amp; Public Channels</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add, edit, reorder, and toggle social media buttons displayed on the public landing page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            title="Refresh links"
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* ── Content Table / Card List ── */}
      <div className="p-5">
        {loading ? (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Loading social links…</p>
          </div>
        ) : links.length === 0 ? (
          <div className="py-10 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-800">No Social Channels Added</p>
            <p className="text-xs text-gray-500">
              Click &quot;Add Channel&quot; to configure YouTube, WhatsApp, Telegram, Instagram, or Play Store links for your students and visitors.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Channel</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {links.map((item) => {
              const theme = getPlatformTheme(item.platform)

              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    item.is_active ? 'bg-white hover:bg-gray-50/70' : 'bg-gray-50/60 opacity-70'
                  }`}
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${theme.badgeBg}`}>
                      <PlatformIcon platform={item.platform} className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          Order: {item.display_order}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.is_active ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate inline-flex items-center gap-1 mt-0.5 max-w-xs sm:max-w-md"
                      >
                        <span className="truncate">{item.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      title={item.is_active ? 'Hide from public landing page' : 'Show on public landing page'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        item.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item.is_active ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
                      <span>{item.is_active ? 'Active' : 'Hidden'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit channel"
                      className="p-1.5 text-gray-500 hover:text-blue-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      title="Delete channel"
                      className="p-1.5 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Share2 className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-gray-900 text-base">
                  {editingItem ? 'Edit Social Channel' : 'Add Social Channel'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Display Title (Button Label)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube, WhatsApp Community, Telegram"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Destination URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must include https:// (e.g. https://www.youtube.com/@channel or https://wa.me/...)
                </p>
              </div>

              {/* Display Order & Active status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 py-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Show on Landing Page
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Create Channel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-semibold text-gray-900 text-base">
                Delete &quot;{deletingItem.title}&quot;?
              </h4>
              <p className="text-xs text-gray-500">
                This will remove the channel button from the public landing page.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Channel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
