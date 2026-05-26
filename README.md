```markdown
# 🃏 Poker Range App

Application collaborative de review de ranges poker, en temps réel, construite avec React + Zustand + Supabase.

---

## 🚀 Fonctionnalités

### Authentification
- Inscription avec **email + password + pseudo**
- Connexion persistante via Supabase Auth
- Reconnexion automatique à la session live au rechargement
- **Mot de passe oublié** — email de réinitialisation avec lien sécurisé
- Touche **Entrée** pour soumettre les formulaires

### Groupes & Membres
- Création d'un **groupe** (équipe/coaching) par le master
- Invitation des membres via un **code d'invitation** à 8 caractères
- **Copier le code** en un clic 📋
- **Partage natif mobile** du code d'invitation (iOS / Android) 📤
- **Multi-groupes** — un utilisateur peut appartenir à plusieurs groupes et switcher entre eux
- **Rejoindre / créer un groupe** directement depuis le lobby
- **Quitter un groupe** (joueurs uniquement) avec confirmation
- **Page membres** — le master voit tous les membres et peut en retirer
- Plusieurs groupes indépendants peuvent coexister

### Session live
- Création d'une session avec un **code unique** à 6 caractères
- Les joueurs rejoignent automatiquement la session active du groupe (sans entrer de code)
- **Reconnexion automatique** — si un joueur recharge la page, il retrouve sa session et sa range intactes
- **Modal de confirmation** avant de quitter une session
- Suppression automatique de la session quand **tous les joueurs sont partis** (trigger PostgreSQL)
- **Toast notification** quand un joueur rejoint (côté master) 🎮
- **Indicateur Realtime** (point vert/rouge) — état de la connexion WebSocket en temps réel
- **Compteur d'utilisateurs** connectés dans la session

### Rôles
- **👑 Master** — crée la session, peut voir et éditer la range de chaque joueur, broadcaster une vue à tous, gère les membres et la bibliothèque partagée
- **🎮 Joueur** — rejoint la session, remplit sa range, visible par le master en temps réel, peut observer les ranges des autres joueurs

### Grille de range
- Matrice **13×13** couvrant toutes les combinaisons de mains (AA, AKs, AKo, etc.)
- **Diagonale des paires** mise en évidence avec une bordure amber
- Taille des cellules **responsive** — s'adapte à la taille de l'écran (desktop, mobile portrait, mobile paysage)
- Actions colorées avec dégradé par fréquence sur chaque cellule

### Actions
- **Call** 🟢 — vert
- **Raise** 🔵 — bleu
- **3Bet** 🟠 — orange
- **4Bet** 🔴 — rouge
- **All In** 🟣 — violet
- Sélection de l'action active via la **barre d'actions** en bas d'écran
- Cliquer sur une cellule cycle les fréquences : 0% → 100% → +25% → suppression
- Normalisation automatique des fréquences si le total dépasse 100%

### Contexte par joueur
- **Position** — sélection parmi UTG, UTG+1, UTG+2, MP, HJ, CO, BTN, SB, BB
- **Profondeur (BB)** — saisie libre
- **Versus** — toggle entre **Reg** et **Fish**
- Le contexte est sauvegardé automatiquement dans Supabase à chaque modification

### Ranges séparées Reg / Fish
- Chaque joueur a **deux ranges indépendantes** : une contre les regs, une contre les fish
- Switching entre les deux avec sauvegarde automatique avant le changement

### Vue Master desktop
- Affichage **deux grilles côte à côte** — Reg à gauche, Fish à droite
- Cliquer sur une grille la **sélectionne et l'active** pour édition
- La grille active est mise en évidence avec une bordure colorée
- Mise à jour **temps réel** — le master voit les modifications d'un joueur instantanément

### Broadcast master
- **Œil 👁️ ouvert** à côté d'un joueur = vue imposée à tous les joueurs
- **Œil fermé** = pas de broadcast
- Clic sur l'œil = **toggle** — impose ou libère la vue
- Le master peut naviguer entre les ranges **localement** (sans broadcaster) en cliquant sur le nom
- Les joueurs voient quel joueur est actuellement broadcasted via l'indicateur œil dans leur liste

### Bibliothèque de ranges
- **Sauvegarde** d'une range avec nom, position, BB, versus
- Spinner + **flash vert** sur le bouton 💾 après sauvegarde
- Deux types : **Personnelle** 🔒 (visible uniquement par son créateur) ou **Partagée** 👥 (visible par tout le groupe — master uniquement)
- **Filtres** : par position, versus, personnelle/partagée
- **Visualisation** de la grille directement dans la bibliothèque
- **Suppression** : le joueur supprime ses ranges personnelles, le master peut tout supprimer
- Accessible depuis le **lobby** et depuis la **session live**
- Depuis une session : bouton "Utiliser cette range" pour charger une range sauvegardée

### Realtime (Supabase)
- Les ranges des joueurs se synchronisent en **temps réel**
- Le master voit les modifications d'un joueur sans rafraîchir
- La liste des joueurs se met à jour automatiquement
- Les sessions actives apparaissent automatiquement dans le lobby des joueurs

### PWA (Progressive Web App)
- **Installable** sur l'écran d'accueil mobile et desktop
- S'ouvre en **plein écran** sans barre de navigateur
- **Service worker** — cache intelligent pour éviter les problèmes de version stale
- Compatible iOS (Safari) et Android (Chrome)

---

## 🗄️ Structure de la base de données

```sql
-- Groupes
create table groups (
  id uuid primary key,
  name text not null,
  invite_code text unique not null,
  created_at timestamp
);

-- Membres
create table memberships (
  id uuid primary key,
  user_id uuid references auth.users,
  group_id uuid references groups,
  role text check (role in ('master', 'member')),
  username text not null,
  last_seen timestamp,
  created_at timestamp,
  unique(user_id, group_id)
);

-- Sessions de review
create table sessions (
  id uuid primary key,
  code text unique not null,
  master_id uuid,
  group_id uuid references groups,
  context jsonb,
  active_player_id uuid,
  created_at timestamp
);

-- Joueurs dans une session
create table players (
  id uuid primary key,
  session_id uuid references sessions,
  user_id uuid references auth.users,
  name text not null,
  role text check (role in ('master', 'player')),
  range_reg jsonb,
  range_fish jsonb,
  context jsonb,
  is_active boolean default true,
  created_at timestamp
);

-- Bibliothèque de ranges
create table saved_ranges (
  id uuid primary key,
  user_id uuid references auth.users,
  group_id uuid references groups,
  player_name text,
  name text not null,
  context jsonb,
  range jsonb,
  is_shared boolean default false,
  created_at timestamp
);
```

### Trigger — suppression automatique de session vide
```sql
CREATE OR REPLACE FUNCTION delete_empty_session()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM sessions
  WHERE id = NEW.session_id
  AND NOT EXISTS (
    SELECT 1 FROM players
    WHERE session_id = NEW.session_id
    AND is_active = true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_empty_session
AFTER UPDATE OF is_active ON players
FOR EACH ROW
WHEN (NEW.is_active = false)
EXECUTE FUNCTION delete_empty_session();
```

---

## 🏗️ Architecture du code

```
src/
├── components/
│   ├── Layout/
│   │   ├── BottomActionBar.jsx     # barre d'actions fixe en bas
│   │   ├── DesktopActionSidebar.jsx
│   │   └── TopFilters.jsx
│   └── RangeGrid/
│       ├── RangeCell.jsx           # cellule individuelle avec dégradé
│       ├── RangeGrid.jsx           # grille 13x13 responsive
│       └── rangeMatrix.js          # génération de la matrice initiale
├── data/
│   └── actions.js                  # définition des actions (Call, Raise, etc.)
├── lib/
│   ├── session.js                  # toutes les fonctions Supabase
│   └── supabase.js                 # client Supabase
├── pages/
│   ├── DashboardPage.jsx           # page principale (grille + sidebar)
│   ├── GroupPage.jsx               # créer ou rejoindre un groupe (inline ou plein écran)
│   ├── GroupSelectPage.jsx         # sélection du groupe actif (multi-groupes)
│   ├── LibraryPage.jsx             # bibliothèque de ranges
│   ├── LobbyPage.jsx               # lobby (créer/rejoindre session)
│   ├── LoginPage.jsx               # connexion / inscription / mot de passe oublié
│   ├── MembersPage.jsx             # gestion des membres (master)
│   └── ResetPasswordPage.jsx       # réinitialisation du mot de passe
├── stores/
│   └── rangeStore.js               # store Zustand (état global)
├── styles/
│   └── globals.css
├── App.jsx                         # routing + auth + reconnexion + password recovery
└── main.jsx                        # enregistrement PWA service worker
```

---

## 🔧 Stack technique

- **React** + **Vite**
- **Zustand** — state management
- **Supabase** — PostgreSQL + Auth + Realtime + RLS

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

## 🌐 Compatibilité navigateurs

| Navigateur | Support |
|-----------|---------|
| Chrome | ✅ |
| Edge | ✅ |
| Safari iOS | ✅ |
| Chrome Android | ✅ |
| Firefox | ⚠️ Partiellement supporté |

---

## 🔐 Permissions

| Action | Joueur | Master |
|--------|--------|--------|
| Créer une session | ❌ | ✅ |
| Rejoindre une session | ✅ | ✅ |
| Éditer sa range | ✅ | ✅ |
| Voir la range des joueurs | ❌ | ✅ |
| Broadcaster une vue | ❌ | ✅ |
| Observer la range d'un joueur | ✅ (local) | ✅ |
| Sauvegarder une range personnelle | ✅ | ✅ |
| Créer une range partagée | ❌ | ✅ |
| Supprimer sa range personnelle | ✅ | ✅ |
| Supprimer n'importe quelle range | ❌ | ✅ |
| Gérer les membres | ❌ | ✅ |
| Quitter un groupe | ✅ | ❌ |

---

## ⚙️ Installation locale

```bash
git clone https://github.com/...
cd poker-collab
npm install
```

Créer un fichier `.env` à la racine :
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

## 🚀 Déploiement

Le projet est déployé automatiquement sur **Vercel** à chaque push sur `main`.

Les variables d'environnement sont à configurer dans Vercel → Settings → Environment Variables :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🗺️ Roadmap

- [ ] Historique des sessions
- [ ] Nom de session personnalisé
- [ ] Mode spectateur (rejoindre en lecture seule)

