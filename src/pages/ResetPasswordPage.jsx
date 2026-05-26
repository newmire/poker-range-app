/**
 * ResetPasswordPage.jsx — Page de réinitialisation du mot de passe
 *
 * Affichée quand l'utilisateur clique le lien de réinitialisation dans son email.
 * Supabase détecte le token dans l'URL et déclenche l'event PASSWORD_RECOVERY.
 * L'utilisateur entre son nouveau mot de passe et confirme.
 */

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  /**
   * Met à jour le mot de passe via Supabase Auth.
   * onDone() est appelé après succès pour retourner à la page de connexion.
   */
  const handleReset = async () => {
    if (!password.trim() || !confirm.trim()) return setError('Remplissez tous les champs')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas')
    if (password.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères')

    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => onDone(), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleReset()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🃏 Poker Range</h1>
        <p style={styles.subtitle}>Nouveau mot de passe</p>

        {success ? (
          <p style={styles.success}>✓ Mot de passe mis à jour ! Redirection...</p>
        ) : (
          <>
            <input
              style={styles.input}
              placeholder="Nouveau mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <input
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} onClick={handleReset} disabled={loading}>
              {loading ? 'Mise à jour...' : 'Confirmer'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  card: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' },
  title: { color: 'white', fontSize: '28px', margin: 0 },
  subtitle: { color: '#666', fontSize: '14px', margin: 0 },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
  success: { color: '#22c55e', fontSize: '14px', margin: 0, textAlign: 'center' },
}