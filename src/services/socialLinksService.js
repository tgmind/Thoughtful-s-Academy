import { supabase } from '../lib/supabase'

/**
 * Fetch all active social media links for public display
 * Ordered by display_order ascending, then created_at
 */
export async function fetchPublicSocialLinks() {
  try {
    const { data, error } = await supabase
      .from('social_media_links')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching public social links:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Unexpected error fetching social links:', err)
    return []
  }
}

/**
 * Fetch all social links for Admin management (including inactive)
 */
export async function fetchAllSocialLinksAdmin() {
  try {
    const { data, error } = await supabase
      .from('social_media_links')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching admin social links:', error)
      throw error
    }
    return data || []
  } catch (err) {
    console.error('Unexpected error fetching admin social links:', err)
    throw err
  }
}

/**
 * Create a new social media link (Admin only)
 */
export async function createSocialLink(payload) {
  const { data, error } = await supabase
    .from('social_media_links')
    .insert([{
      platform: payload.platform || 'other',
      title: payload.title.trim(),
      url: payload.url.trim(),
      display_order: Number(payload.display_order) || 0,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing social media link (Admin only)
 */
export async function updateSocialLink(id, updates) {
  const payload = { ...updates, updated_at: new Date().toISOString() }
  if (payload.title) payload.title = payload.title.trim()
  if (payload.url) payload.url = payload.url.trim()
  if (payload.display_order !== undefined) payload.display_order = Number(payload.display_order)

  const { data, error } = await supabase
    .from('social_media_links')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a social media link (Admin only)
 */
export async function deleteSocialLink(id) {
  const { error } = await supabase
    .from('social_media_links')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
