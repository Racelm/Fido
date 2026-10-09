# Tiwizi

Plateforme SaaS de collaboration entre fiduciaires, experts-comptables et leurs clients au Maroc.

## Stack

- Next.js 15 (App Router) + TypeScript + React 19
- Supabase (Auth, Postgres, Storage)
- E-mails transactionnels via Resend (production) ou proxy Emergent

## Déploiement sur Hostinger

Application Node.js Next.js déployée depuis GitHub sur la branche `main`.

- **Build** : `pnpm build` (ou `npm run build`)
- **Start** : `pnpm start` (ou `npm start`)
- **Node.js** : 20+
- **URL de production** : définir l’URL publique dans `NEXT_PUBLIC_SITE_URL`

Variables d'environnement à configurer dans Hostinger :
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`, `EMAIL_REPLY_TO` et, si le proxy historique est utilisé, `EMERGENT_EMAIL_KEY`.

Dans Supabase Auth, configurer l'URL du site sur `https://tiwizi.raeldata.com` et les Redirect URLs nécessaires sous ce domaine, par exemple `https://tiwizi.raeldata.com/**`.

## Auth-Konfiguration

- **Supabase Auth → URL Configuration → Site URL**: auf die produktive Basis-URL setzen, den in Hostinger verwendeten Wert von `NEXT_PUBLIC_SITE_URL`. Keine lokale oder Preview-Domain fest eintragen.
- **Redirect URLs**: ``https://<produktiv-adresse>/**` und `http://localhost:3000/**` eintragen. Ersetze den Platzhalter durch die tatsächliche Hostinger-Domain; diese Domain bleibt konfigurierbar und ist nicht fest im Code hinterlegt.
- **Hostinger**: `NEXT_PUBLIC_SITE_URL` muss exakt die öffentliche Basis-URL der bereitgestellten App enthalten, ohne abschließenden Schrägstrich.
- **Wichtig**: `NEXT_PUBLIC_*`-Variablen werden beim Build eingebaut. Nach einer Änderung muss die Anwendung neu gebaut und neu deployed werden.

## Développement local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Puis : `http://localhost:3000`.

## Fonctionnalités

- Inscription du cabinet et invitations clients par lien sécurisé
- Authentification Supabase SSR
- Tableau de bord cabinet et espace client
- Demandes documentaires avec catégories et échéances
- Upload sécurisé et versionnement des documents
- Messagerie multi-tenant avec RLS
- Journal d'audit
- Échéances fiscales marocaines et rappels
- Gestion des collaborateurs et invitations

## Structure

```
app/          → routes et fonctionnalités Next.js
components/   → interface partagée
lib/          → Supabase, e-mails, notifications et sécurité
supabase/     → schéma et migrations
scripts/      → outils de développement
docs/         → documentation
```
