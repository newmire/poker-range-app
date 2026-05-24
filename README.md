---

## 🔧 Stack technique

- **React** + **Vite**
- **Zustand** — state management
- **Supabase** — PostgreSQL + Auth + Realtime + RLS

---

## 🔐 Sécurité

- RLS (Row Level Security) activé sur toutes les tables
- Politiques basées sur `auth.uid()` — chaque utilisateur n'accède qu'aux données de son groupe
- Variables d'environnement pour les clés Supabase (jamais commitées)

---

## 📱 Responsive

| Écran | Comportement |
|-------|-------------|
| Desktop | Sidebar gauche + grille(s) grandes |
| Mobile portrait | Sidebar compacte + petite grille |
| Mobile paysage | Grille moyenne |
| Master desktop | Deux grilles côte à côte (Reg + Fish) |
| Master mobile | Une grille + toggle Reg/Fish |

---

## 🔑 Permissions

| Action | Joueur | Master |
|--------|--------|--------|
| Créer une session | ❌ | ✅ |
| Rejoindre une session | ✅ | ✅ |
| Éditer sa range | ✅ | ✅ |
| Voir la range des joueurs | ❌ | ✅ |
| Sauvegarder une range personnelle | ✅ | ✅ |
| Créer une range partagée | ❌ | ✅ |
| Supprimer sa range personnelle | ✅ | ✅ |
| Supprimer n'importe quelle range | ❌ | ✅ |
| Gérer les membres | ❌ | ✅ |

---

## 🌐 Déploiement

L'application est déployée sur **Vercel** — accessible depuis n'importe quel appareil, y compris mobile en 4G.

Variables d'environnement requises :