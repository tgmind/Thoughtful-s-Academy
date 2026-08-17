import { supabase } from './supabase'

/**
 * Logs a batch activity event for the 24-hour audit log
 * @param {Object} params
 * @param {string} params.batchId - Target batch ID
 * @param {Array<string>} [params.batchIds] - Optional array of batch IDs if multi-batch
 * @param {Object} params.user - Current user object
 * @param {string} [params.userName] - Doer's full name
 * @param {string} [params.userRole] - Doer's role ('admin' | 'teacher')
 * @param {string} params.actionType - 'create' | 'update' | 'delete' | 'toggle_visibility'
 * @param {string} [params.entityType] - 'study_card' | 'homework' | 'live_class'
 * @param {string} params.entityTitle - Name/title of card or content
 * @param {string} [params.details] - Extra context (e.g. subject, folder, published/hidden status)
 */
export async function logActivity({
  batchId,
  batchIds,
  user,
  userName,
  userRole,
  actionType,
  entityType = 'study_card',
  entityTitle,
  details
}) {
  try {
    const doerId = user?.id || null
    let doerName = userName || user?.user_metadata?.full_name || user?.email || 'Teacher'
    let doerRole = userRole || (user?.user_metadata?.role === 'admin' ? 'admin' : 'teacher')

    // Fetch profile name if missing
    if (doerId && (!userName || userName === 'Teacher')) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', doerId)
        .maybeSingle()
      if (prof?.full_name) doerName = prof.full_name
      if (prof?.role) doerRole = prof.role
    }

    const targetBatchIds = Array.isArray(batchIds) && batchIds.length > 0
      ? batchIds
      : (batchId ? [batchId] : [])

    if (targetBatchIds.length === 0) return

    const rows = targetBatchIds.map(bId => ({
      batch_id: bId,
      user_id: doerId,
      user_name: doerName,
      user_role: doerRole,
      action_type: actionType,
      entity_type: entityType,
      entity_title: entityTitle || 'Untitled',
      details: details || null
    }))

    await supabase.from('activity_logs').insert(rows)
  } catch (err) {
    console.error('Failed to record activity log:', err)
  }
}
