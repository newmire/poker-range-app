# 🃏 Poker Range App

Application collaborative de review de ranges poker, en temps réel, construite avec React + Zustand + Supabase.

---

## 🚀 Fonctionnalités

### Session live
- Création d'une session avec un **code unique** à partager
- Rejoindre une session avec un **pseudo** + le code
- **Reconnexion automatique** — si un joueur recharge la page, il retrouve sa session et sa range intactes
- Bouton **Quitter** pour sortir proprement d'une session

### Rôles
- **👑 Master** — crée la session, peut voir et éditer la range de chaque joueur, se reconnecte et récupère son rôle automatiquement
- **🎮 Joueur** — rejoint la session, remplit sa range, visible par le master en temps réel

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
- Cliquer sur une cellule cycle les fréquences : 0% → 100% → 75% → 50% → 25% → suppression
- Normalisation automatique des fréquences si le total dépasse 100%

### Contexte par joueur
- **Position** — sélection parmi UTG, UTG+1, UTG+2, MP, HJ, CO, BTN, SB, BB
- **Profondeur (BB)** — saisie libre
- **Versus** — toggle entre **Reg** et **Fish**
- Le contexte est sauvegardé automatiquement dans Supabase à chaque modification

### Ranges séparées Reg / Fish
- Chaque joueur a **deux ranges indépendantes** : une contre les regs, une contre les fish
- Switching entre les deux avec sauvegarde automatique de la range courante avant le changement
- Les données sont rechargées depuis Supabase avant chaque switch pour éviter les écrasements

### Vue Master desktop
- Affichage **deux grilles côte à côte** — Reg à gauche, Fish à droite
- Cliquer sur une grille (ou sur les boutons Reg/Fish) la **sélectionne et l'active** pour édition
- La grille active est mise en évidence avec une bordure colorée (verte pour Reg, orange pour Fish)
- La grille inactive affiche la range en lecture seule
- Mise à jour **temps réel** — si un joueur modifie sa range, le master qui la consulte voit les changements instantanément

### Vue Master mobile
- Une seule grille avec toggle Reg/Fish (les deux côte à côte ne tiennent pas sur mobile)

### Realtime (Supabase)
- Les ranges des joueurs se synchronisent en **temps réel** via Supabase Realtime
- Le master voit les modifications d'un joueur sans avoir à rafraîchir
- La liste des joueurs se met à jour automatiquement quand quelqu'un rejoint

---

## 🗄️ Structure de la base de données

```sql
-- Sessions de review
create table sessions (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,         -- code de session (ex: ABC123)
  master_id uuid,                    -- id du joueur master
  context jsonb default '{}',        -- contexte global de la session
  active_player_id uuid,             -- joueur actuellement affiché
  created_at timestamp default now()
);

-- Joueurs dans une session
create table players (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  role text check (role in ('master', 'player')) default 'player',
  range jsonb default '[]',          -- legacy (non utilisé)
  range_reg jsonb default '[]',      -- range contre les regs
  range_fish jsonb default '[]',     -- range contre les fish
  context jsonb default '{}',        -- position, profondeur, versus
  created_at timestamp default now()
);

-- Ranges sauvegardées (bibliothèque — à venir)
create table saved_ranges (
  id uuid default gen_random_uuid() primary key,
  player_name text not null,
  name text not null,
  context jsonb default '{}',        -- position, profondeur, versus
  range jsonb default '[]',
  created_at timestamp default now()
);
```

---

## 🏗️ Architecture du code
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
│   └── LobbyPage.jsx               # page de création/join session
├── stores/
│   └── rangeStore.js               # store Zustand (état global)
├── styles/
│   └── globals.css
├── App.jsx                         # routing + reconnexion automatique
└── main.jsx

---

## 🔧 Stack technique

- **React** + **Vite**
- **Zustand** — state management
- **Supabase** — base de données PostgreSQL + Realtime + RLS
- **CSS-in-JS** inline styles

---

## 📱 Responsive

| Écran | Comportement |
|-------|-------------|
| Desktop | Sidebar gauche + grille(s) grandes |
| Mobile portrait | Sidebar en haut compacte + petite grille |
| Mobile paysage | Grille moyenne |
| Master desktop | Deux grilles côte à côte (Reg + Fish) |
| Master mobile | Une grille + toggle Reg/Fish |

---

## 🔐 Sécurité

RLS (Row Level Security) activé sur toutes les tables avec politique permissive pour l'instant (pas d'auth utilisateur — anonyme par pseudo).

---

## 🗺️ Roadmap

- [ ] Système d'auth permanent (Supabase Auth — email + password)
- [ ] Groupes/équipes indépendants avec invitation par le master
- [ ] Bibliothèque de ranges sauvegardées par contexte (position, BB, versus)
- [ ] Accès à la bibliothèque depuis le dashboard
- [ ] Ranges publiques au sein du groupe uniquement