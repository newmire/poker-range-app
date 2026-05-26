/**
 * LoginPage.jsx — Page de connexion, inscription et mot de passe oublié
 *
 * Gère trois modes :
 * - 'login' : connexion avec email + mot de passe
 * - 'register' : inscription avec email + mot de passe + pseudo
 * - 'forgot' : demande de réinitialisation du mot de passe par email
 *
 * Utilise Supabase Auth pour l'authentification.
 * Appuyer sur Entrée dans n'importe quel champ soumet le formulaire.
 */

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return setError('Remplissez tous les champs')
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) return setError('Remplissez tous les champs')
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      })
      if (error) throw error
      setMessage('Vérifiez votre email pour confirmer votre inscription.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Envoie un email de réinitialisation du mot de passe.
   * Supabase envoie un lien qui redirige vers l'app avec un token.
   * App.jsx détecte l'event PASSWORD_RECOVERY et affiche le formulaire.
   */
  const handleForgot = async () => {
    if (!email.trim()) return setError('Entrez votre email')
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://poker-range-app-pj2u.vercel.app/',
      })
      if (error) throw error
      setMessage('Un email de réinitialisation a été envoyé.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /** Soumet le formulaire si l'utilisateur appuie sur Entrée */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      if (mode === 'login') handleLogin()
      else if (mode === 'register') handleRegister()
      else if (mode === 'forgot') handleForgot()
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🃏 Poker Range</h1>
        <p style={styles.subtitle}>Outil de review collaborative</p>

        {/* Toggle Connexion / Inscription — masqué en mode forgot */}
        {mode !== 'forgot' && (
          <div style={styles.toggleRow}>
            <button
              style={{
                ...styles.toggleBtn,
                backgroundColor: mode === 'login' ? '#22c55e' : '#1a1a1a',
                color: mode === 'login' ? 'white' : '#666',
                border: mode === 'login' ? 'none' : '1px solid #333',
              }}
              onClick={() => { setMode('login'); setError(null); setMessage(null) }}
            >
              Connexion
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                backgroundColor: mode === 'register' ? '#22c55e' : '#1a1a1a',
                color: mode === 'register' ? 'white' : '#666',
                border: mode === 'register' ? 'none' : '1px solid #333',
              }}
              onClick={() => { setMode('register'); setError(null); setMessage(null) }}
            >
              Inscription
            </button>
          </div>
        )}

        {/* Mode mot de passe oublié */}
        {mode === 'forgot' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: '#888', fontSize: '13px', margin: 0, textAlign: 'center' }}>
              Entre ton email pour recevoir un lien de réinitialisation.
            </p>
            <input
              style={styles.input}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            {message && <p style={styles.success}>{message}</p>}
            <button style={styles.btnPrimary} onClick={handleForgot} disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <button
              style={styles.btnLink}
              onClick={() => { setMode('login'); setError(null); setMessage(null) }}
            >
              ← Retour à la connexion
            </button>
          </div>
        )}

        {/* Mode connexion / inscription */}
        {mode !== 'forgot' && (
          <>
            {mode === 'register' && (
              <input
                style={styles.input}
                placeholder="Pseudo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}

            <input
              style={styles.input}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <input
              style={styles.input}
              placeholder="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {error && <p style={styles.error}>{error}</p>}
            {message && <p style={styles.success}>{message}</p>}

            <button
              style={styles.btnPrimary}
              onClick={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>

            {/* Lien mot de passe oublié — connexion uniquement */}
            {mode === 'login' && (
              <button
                style={styles.btnLink}
                onClick={() => { setMode('forgot'); setError(null); setMessage(null) }}
              >
                Mot de passe oublié ?
              </button>
            )}
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
  toggleRow: { display: 'flex', gap: '6px', width: '100%' },
  toggleBtn: { flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: '0.15s' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' },
  btnLink: { background: 'transparent', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', padding: '4px', textDecoration: 'underline' },
  error: { color: '#ef4444', fontSize: '13px', margin: 0 },
  success: { color: '#22c55e', fontSize: '13px', margin: 0 },
}