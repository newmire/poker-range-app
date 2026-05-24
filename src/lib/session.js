import { supabase } from './supabase'

export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createSession(masterName, context, groupId) {
  const code = generateCode()
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ code, context, group_id: groupId })
    .select()
    .single()
  if (sessionError) throw sessionError

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ session_id: session.id, name: masterName, role: 'master' })
    .select()
    .single()
  if (playerError) throw playerError

  await supabase
    .from('sessions')
    .update({ master_id: player.id })
    .eq('id', session.id)

  const { data: updatedSession, error: fetchError } = await supabase
    .from('sessions')
    .select()
    .eq('id', session.id)
    .single()
  if (fetchError) throw fetchError

  return { session: updatedSession, player }
}

export async function joinSession(code, playerName) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select()
    .eq('code', code.toUpperCase())
    .single()
  if (sessionError) throw new Error('Session introuvable')

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ session_id: session.id, name: playerName, role: 'player' })
    .select()
    .single()
  if (playerError) throw playerError

  return { session, player }
}

export async function saveRange(playerId, range, versus = 'reg') {
  const column = versus === 'fish' ? 'range_fish' : 'range_reg'
  const { error } = await supabase
    .from('players')
    .update({ [column]: range })
    .eq('id', playerId)
  if (error) console.error('❌ erreur saveRange', error)
}

export async function getPlayers(sessionId) {
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('session_id', sessionId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function setActivePlayer(sessionId, playerId) {
  const { error } = await supabase
    .from('sessions')
    .update({ active_player_id: playerId })
    .eq('id', sessionId)
  if (error) console.error('❌ erreur setActivePlayer', error)
}

export function subscribeToPlayers(sessionId, onChange) {
  return supabase
    .channel(`players:${sessionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `session_id=eq.${sessionId}`,
    }, onChange)
    .subscribe()
}

export function subscribeToSession(sessionId, onChange) {
  return supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`,
    }, onChange)
    .subscribe()
}

export async function saveContext(playerId, context) {
  const { error } = await supabase
    .from('players')
    .update({ context })
    .eq('id', playerId)
  if (error) console.error('❌ erreur saveContext', error)
}

export async function getContext(playerId) {
  const { data, error } = await supabase
    .from('players')
    .select('context')
    .eq('id', playerId)
    .single()
  if (error) console.error('❌ erreur getContext', error)
  return data?.context ?? {}
}
export async function getActiveSession(groupId) {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}

export function subscribeToGroupSessions(groupId, onChange) {
  return supabase
    .channel(`group_sessions:${groupId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter: `group_id=eq.${groupId}`,
    }, onChange)
    .subscribe()
}
export async function saveRangeToLibrary({ userId, groupId, name, context, range, isShared }) {
  const { error } = await supabase
    .from('saved_ranges')
    .insert({
      user_id: userId,
      group_id: groupId,
      player_name: context.username ?? '',
      name,
      context,
      range,
      is_shared: isShared,
    })
  if (error) console.error('❌ erreur saveRangeToLibrary', error)
}

export async function getSavedRanges(userId, groupId) {
  const { data, error } = await supabase
    .from('saved_ranges')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getSavedRanges error:', error)
    return []
  }
  return data ?? []
}