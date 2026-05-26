/**
 * session.js — Toutes les fonctions d'interaction avec Supabase
 *
 * Couvre :
 * - Création et gestion des sessions live
 * - Gestion des joueurs
 * - Sauvegarde des ranges et contextes
 * - Bibliothèque de ranges
 * - Gestion des membres du groupe
 * - Realtime (subscriptions)
 */

import { supabase } from './supabase'

/**
 * Génère un code de session aléatoire à 6 caractères.
 * Utilise un alphabet sans caractères ambigus (pas de 0/O, 1/I).
 */
export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * Crée une nouvelle session live et y ajoute le master comme premier joueur.
 * Retry automatique jusqu'à 3 fois en cas d'erreur réseau.
 *
 * @param {string} masterName - Pseudo du master
 * @param {object} context - Contexte de la session (optionnel)
 * @param {string} groupId - ID du groupe auquel appartient la session
 * @param {number} attempt - Numéro de tentative (interne, ne pas passer manuellement)
 * @returns {{ session, player }} - La session créée et le joueur master
 */
export async function createSession(masterName, context, groupId, attempt = 1) {
  const MAX_ATTEMPTS = 3
  const RETRY_DELAY = 2000 // 2 secondes entre chaque tentative

  try {
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

  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      console.warn(`createSession tentative ${attempt} échouée, retry dans ${RETRY_DELAY}ms...`, error)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return createSession(masterName, context, groupId, attempt + 1)
    }
    throw error
  }
}

/**
 * Rejoint une session existante via son code.
 *
 * @param {string} code - Code de session à 6 caractères
 * @param {string} playerName - Pseudo du joueur
 * @returns {{ session, player }}
 */
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

/**
 * Sauvegarde la range d'un joueur (reg ou fish) en base.
 *
 * @param {string} playerId - ID du joueur
 * @param {array} range - Matrice de range
 * @param {string} versus - 'reg' ou 'fish'
 */
export async function saveRange(playerId, range, versus = 'reg') {
  const column = versus === 'fish' ? 'range_fish' : 'range_reg'
  const { error } = await supabase
    .from('players')
    .update({ [column]: range })
    .eq('id', playerId)
  if (error) console.error('❌ erreur saveRange', error)
}

/**
 * Récupère tous les joueurs d'une session, triés par date de création.
 *
 * @param {string} sessionId
 * @returns {array} Liste des joueurs
 */
export async function getPlayers(sessionId) {
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('session_id', sessionId)
    .order('created_at')
  if (error) throw error
  return data
}

/**
 * Met à jour le joueur actif affiché sur la session (utilisé par le master).
 *
 * @param {string} sessionId
 * @param {string|null} playerId - null pour stopper le broadcast
 */
export async function setActivePlayer(sessionId, playerId) {
  const { error } = await supabase
    .from('sessions')
    .update({ active_player_id: playerId })
    .eq('id', sessionId)
  if (error) console.error('❌ erreur setActivePlayer', error)
}

/**
 * Subscribe aux changements des joueurs d'une session en temps réel.
 *
 * @param {string} sessionId
 * @param {function} onChange - Callback appelé à chaque changement
 * @returns Subscription Supabase (appeler .unsubscribe() pour nettoyer)
 */
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

/**
 * Subscribe aux changements d'une session en temps réel.
 * Utilisé pour détecter le changement de active_player_id.
 *
 * @param {string} sessionId
 * @param {function} onChange
 * @returns Subscription Supabase
 */
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

/**
 * Sauvegarde le contexte d'un joueur (position, BB, versus).
 *
 * @param {string} playerId
 * @param {object} context - { position, stackSize, versus }
 */
export async function saveContext(playerId, context) {
  const { error } = await supabase
    .from('players')
    .update({ context })
    .eq('id', playerId)
  if (error) console.error('❌ erreur saveContext', error)
}

/**
 * Récupère le contexte d'un joueur.
 *
 * @param {string} playerId
 * @returns {object} Contexte du joueur
 */
export async function getContext(playerId) {
  const { data, error } = await supabase
    .from('players')
    .select('context')
    .eq('id', playerId)
    .single()
  if (error) console.error('❌ erreur getContext', error)
  return data?.context ?? {}
}

/**
 * Récupère la session active la plus récente d'un groupe.
 * Retourne null si aucune session trouvée.
 *
 * @param {string} groupId
 * @returns {object|null} Session active ou null
 */
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

/**
 * Subscribe aux nouvelles sessions d'un groupe en temps réel.
 * Utilisé dans le lobby pour détecter automatiquement une session active.
 *
 * @param {string} groupId
 * @param {function} onChange
 * @returns Subscription Supabase
 */
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

/**
 * Sauvegarde une range dans la bibliothèque.
 *
 * @param {object} params
 * @param {string} params.userId - ID de l'utilisateur Auth
 * @param {string} params.groupId - ID du groupe
 * @param {string} params.name - Nom de la range
 * @param {object} params.context - { position, stackSize, versus }
 * @param {array} params.range - Matrice de range
 * @param {boolean} params.isShared - Partagée avec le groupe ou personnelle
 */
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

/**
 * Récupère les ranges sauvegardées accessibles à un utilisateur :
 * - Ses propres ranges (toutes)
 * - Les ranges partagées du groupe
 *
 * @param {string} userId
 * @param {string} groupId
 * @returns {array} Liste de ranges
 */
export async function getSavedRanges(userId, groupId) {
  const { data, error } = await supabase
    .from('saved_ranges')
    .select()
    .or(`user_id.eq.${userId},and(group_id.eq.${groupId},is_shared.eq.true)`)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getSavedRanges error:', error)
    return []
  }
  return data ?? []
}

/**
 * Supprime une range de la bibliothèque.
 *
 * @param {string} rangeId
 */
export async function deleteRange(rangeId) {
  const { error } = await supabase
    .from('saved_ranges')
    .delete()
    .eq('id', rangeId)
  if (error) console.error('❌ erreur deleteRange', error)
}

/**
 * Renomme une range dans la bibliothèque.
 *
 * @param {string} rangeId
 * @param {string} name - Nouveau nom
 */
export async function renameRange(rangeId, name) {
  const { error } = await supabase
    .from('saved_ranges')
    .update({ name })
    .eq('id', rangeId)
  if (error) console.error('❌ erreur renameRange', error)
}

/**
 * Récupère tous les membres d'un groupe.
 *
 * @param {string} groupId
 * @returns {array} Liste des membres
 */
export async function getMembers(groupId) {
  const { data, error } = await supabase
    .from('memberships')
    .select()
    .eq('group_id', groupId)
    .order('created_at')
  if (error) return []
  return data ?? []
}

/**
 * Retire un membre d'un groupe (admin uniquement).
 *
 * @param {string} membershipId
 */
export async function removeMember(membershipId) {
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId)
  if (error) console.error('❌ erreur removeMember', error)
}

/**
 * Met à jour le timestamp last_seen d'un membre.
 * Appelé toutes les 30 secondes (heartbeat) pour indiquer que l'utilisateur est actif.
 *
 * @param {string} membershipId
 */
export async function updateLastSeen(membershipId) {
  const { error } = await supabase
    .from('memberships')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', membershipId)
  if (error) console.error('❌ erreur updateLastSeen', error)
}

/**
 * Quitte un groupe en supprimant le membership de l'utilisateur.
 *
 * @param {string} membershipId
 */
export async function leaveGroup(membershipId) {
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId)
  if (error) console.error('❌ erreur leaveGroup', error)
}

/**
 * Marque un joueur comme inactif quand il quitte la session.
 * Le trigger DB supprime automatiquement la session si tous les joueurs sont inactifs.
 *
 * @param {string} playerId
 */
export async function leaveSession(playerId) {
  const { error } = await supabase
    .from('players')
    .update({ is_active: false })
    .eq('id', playerId)
  if (error) console.error('❌ erreur leaveSession', error)
}