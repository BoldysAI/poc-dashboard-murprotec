# docs/agent/poc-wow.md — Surcouches démo produit

> À lire pour brief, alertes, assistant IA, vision produit post-POC.
> Transverse → `/AGENTS.md`. Ne remplace pas `tresorerie.md` / `reporting.md`.

## Golden rules

1. **Surcouche uniquement** — pas de nouveau mapping Excel, pas de BDD. Clé LLM uniquement dans `.env.local`.
2. **Chiffres = session** — brief / alertes / assistant lisent `TresorerieData` / `ReportingBundle` déjà parsés.
3. **Copy métier** — pas de cellules Excel ni « hors AT » à l’écran ; badge « Aperçu produit » OK sur teasers.
4. **Ne pas polluer le dashboard AT** — brief & alertes derrière le bouton **Brief & alertes** (`InsightsDrawer`) ; catalogue post-POC derrière **Vision produit** dans le header.
5. **Assistant IA** : `POST /api/assistant` → OpenAI ; agrandissable (icône dans le header du chat). Fallback déterministe si clé absente / erreur API.

## Env

```bash
# .env.local (gitignoré) — voir .env.example
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Redémarrer `npm run dev` après ajout / changement de clé.

## Pack livré

| Feature | Accès UI | Code |
|---|---|---|
| Brief du mois | Tiroir **Brief & alertes** (header page, si données) | `brief.ts` + `BriefDuMois` |
| Centre d’alertes | Même tiroir | `alerts.ts` + `AlertsCenter` |
| Assistant IA | Bouton flottant + agrandir | `AiAssistant` · `/api/assistant` |
| Vision produit (post-POC) | Header **Vision produit** | `PostPocInfoButton` |
| Radar multi-agences | **Retiré** (illisibilité) | — |

## Pattern — wiring

- Dashboard AT reste propre (KPI / charts uniquement).
- `InsightsDrawer` : bouton avec badge nb alertes → panneau latéral Brief + Alertes.
- `PostPocInfoButton` : modal catalogue (intégrations, diffusion, pilotage) avec explication par feature.
- Pas de fake doors dispersées dans le flux principal.

## What not to do

- ❌ Remettre brief / alertes / teasers en plein milieu du dashboard.
- ❌ Committer `.env.local` ou exposer la clé via `NEXT_PUBLIC_*`.
- ❌ Réintroduire un radar multi-séries illisible sans demande explicite.
