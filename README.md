# Fido

Fido est une plateforme SaaS de collaboration entre fiduciaires / cabinets comptables et leurs clients.

## MVP – Phase 1

- Tableau de bord cabinet
- Gestion des clients
- Espace client
- Messages
- Documents
- Demandes de documents
- Interface responsive en français

## Stack prévue

- Next.js + TypeScript
- React
- Supabase (Auth, PostgreSQL, Storage)
- Hébergement Hostinger

## Démarrage local

1. Créez un projet Supabase et renseignez `NEXT_PUBLIC_SUPABASE_URL` et
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local`.
2. Exécutez `supabase/schema.sql`, puis les migrations de
   `supabase/migrations/` dans l'éditeur SQL Supabase. La migration Phase 1
   crée automatiquement l'organisation et le profil `owner` à l'inscription.
3. Activez la confirmation e-mail dans Supabase Auth selon votre politique.

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.
