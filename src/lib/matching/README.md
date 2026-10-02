# Garden of Alliance — Matchmaking Engine

## Architecture Overview

A deterministic, explainable, reciprocal, and configurable matchmaking engine designed specifically for a Christian (Pentecostal) dating platform serving Cameroonian adults aged 21+.

**Core principle:** The engine answers one question — *"Does User A genuinely match User B's expectations, and does User B genuinely match User A's expectations?"*

---

## File Structure

```
src/lib/matching/
├── index.ts          # Barrel export — single entry point
├── types.ts          # TypeScript interfaces for all data structures
├── config.ts         # Configurable weights, thresholds, compatibility matrices
├── hard-filters.ts   # Hard filter engine — eliminates incompatible profiles
├── scoring.ts        # Deterministic compatibility scoring engine
├── engine.ts         # Main reciprocal matchmaking engine
├── semantic.ts       # Open-ended response extraction (keyword-based)
├── __tests__/
│   └── matching-engine.test.ts  # Jest test suite
└── examples/
    └── demo.ts       # Runnable demonstration with example profiles
```

### Database

```
supabase/
└── matching-engine-schema.sql  # Full schema: tables, indexes, RLS, triggers
```

### API

```
src/app/api/matching/
└── discover/
    └── route.ts      # GET: discover matches | POST: check specific match
```

---

## Matching Pipeline

```
USER A + USER B
       │
       ▼
┌──────────────────┐
│  HARD FILTERS    │  ← Eliminates fundamental incompatibilities
│  (Before scoring)│     - Christian identity (explicit "no" only)
│                  │     - Children preference
│                  │     - Marriage desire
│                  │     - Behavioral deal-breakers
└────────┬─────────┘
         │ Passed?
    ┌────┴────┐
    │ NO      │ YES
    ▼         ▼
 STOP    ┌──────────────────┐
         │  SCORE A → B     │  ← Directional compatibility
         │  (6 categories)  │     - Spiritual (30%)
         └────────┬─────────┘     - Marriage & Family (25%)
                  │               - Values (20%)
         ┌────────┴─────────┐     - Personality (10%)
         │  SCORE B → A     │     - Lifestyle (10%)
         │  (6 categories)  │     - Preferences (5%)
         └────────┬─────────┘
                  │
         ┌────────┴─────────┐
         │  MUTUAL SCORE    │  ← 0.6 × weaker + 0.4 × stronger direction
         │                  │     A one-sided match still costs, without capping everything
         └────────┬─────────┘
                  │
         ┌────────┴─────────┐
         │  RANK BY SCORE   │  ← "Découvrir" shows every non-excluded profile
         │                  │     with its %, highest first (no 70 % cut-off)
         └────────┬─────────┘
                  │
         ┌────────┴─────────┐
         │  RANK & DIVERSIFY│  ← Top matches, variety in results
         └────────┬─────────┘
                  │
         ┌────────┴─────────┐
         │  RETURN MATCHES  │  ← Only compatible profiles to frontend
         └──────────────────┘
```

---

## Category Weights (Configurable)

| Category          | Weight | Priority |
|-------------------|--------|----------|
| Spiritual         | 30%    | Highest  |
| Marriage & Family | 25%    | High     |
| Values            | 20%    | High     |
| Personality       | 10%    | Medium   |
| Lifestyle         | 10%    | Medium   |
| Preferences       | 5%     | Lowest   |

**Total: 100%**

Weights are stored in the database (`matching_config` table) and can be changed by admins without code deployment.

---

## Match Thresholds

| Score   | Level              | Status             |
|---------|--------------------|--------------------|
| 0–59    | No Match           | NOT_COMPATIBLE     |
| 60–69   | Weak Compatibility | POTENTIAL_MATCH    |
| 70–79   | Good Match         | RECOMMENDED_MATCH  |
| 80–89   | Very Strong Match  | RECOMMENDED_MATCH  |
| 90–100  | Exceptional Match  | STRONG_MATCH       |

---

## Hard Filters (Must Pass Before Scoring)

These filters prevent matching even if everything else aligns:

1. **Christian identity** — Excluded only on an explicit "Non, mais en recherche" / "Autre" (an unanswered question never excludes)
2. **Denomination** — *No longer a hard filter* (2026-09-28): it weighs 12 % of the spiritual score via `denominationAffinity` (same 100, related 85, same Protestant/Evangelical family 65, otherwise 40)
3. **Children preference** — If one requires children and the other doesn't want them → NO MATCH
4. **Marriage desire** — Both must desire marriage (score ≥ 2/5)
5. **Gender** — Must be seeking opposite gender
6. **Age** — Both must be 21+
7. **Subscription eligibility** — Free users can't see elite-only profiles
8. **Behavioral deal-breakers** — Explicit non-negotiables from either user
9. **Geographic radius** — If explicitly set, must be within range

---

## Reciprocal Compatibility

The engine computes **two directional scores**:

```
score_A_to_B = How well B matches A's expectations
score_B_to_A = How well A matches B's expectations

mutual_score = round(0.6 × min(A→B, B→A) + 0.4 × max(A→B, B→A))
```

(Pure MIN until 2026-09-28: a single gap in one direction capped the whole score.)

**Data sent to the browser.** The "Découvrir" list only receives, for each other
member, the questionnaire fields the adapter reads (`MATCH_QUESTIONNAIRE_COLS` in
`src/lib/social.ts`) — never the private "Santé" section nor debts. That list must
cover every field `adapter.ts` reads: when it didn't (estChretien missing), every
other member looked "not Christian" and the list was empty.

This prevents scenarios where:
- A highly spiritual user matches with a casual believer (one direction may score high, the other low)
- Age preferences of one user are violated even if the other's are met

---

## Database Schema

### Tables

1. **`matching_config`** — Configurable weights and thresholds
2. **`questionnaire_responses`** — Full questionnaire data per user
3. **`match_cache`** — Cached match results with invalidation

### Key Features

- **Indexed pre-filtering** — Gender, age, denomination, marriage desire are indexed for fast candidate retrieval
- **Cache invalidation trigger** — Automatic invalidation when a user updates their questionnaire
- **RLS policies** — Users see only their own data; admins have full access
- **Matching stats view** — Aggregate statistics for admin dashboard

---

## API Endpoints

L'ancienne route `/api/matching/discover` a été supprimée (2026-10-02) : elle
n'était plus utilisée et exposait les profils sans vérifier le statut des
comptes. Le matching est calculé dans l'espace membre (`src/lib/matching/adapter.ts`),
sur les profils que la RLS laisse voir (membres approuvés uniquement).

## Performance Architecture

```
DATABASE (indexed queries)
    │
    ▼
PRE-FILTER (gender, age, denomination, marriage desire)
    │  ← Reduces 100K users to ~500 candidates
    ▼
HARD FILTERS (in-memory)
    │  ← Eliminates fundamental incompatibilities
    ▼
SCORING ENGINE (deterministic)
    │  ← Computes 6 category scores × 2 directions
    ▼
RECIPROCAL CALCULATION
    │  ← MIN(A→B, B→A)
    ▼
THRESHOLD + RANKING
    │  ← Top N matches, diversified
    ▼
FRONTEND (only compatible profiles)
```

**Never compare every profile against every other profile.**

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Incomplete questionnaire (< 60%) | No matches returned |
| Newly registered user | Prompt to complete questionnaire |
| Edited questionnaire | Match cache invalidated automatically |
| Contradictory answers | System uses explicit values as-is (no inference) |
| No preferences set | Neutral-positive scoring (doesn't penalize) |
| Overly restrictive preferences | Returns 0 matches with helpful message |
| No available matches | Returns empty array with completion prompt |
| One user updates profile | Cache invalidated for all their matches |

---

## Excluded from Scoring

These fields exist in profiles but **never influence compatibility**:

- Blood group
- Medical conditions
- General health
- Skin tone
- Body shape
- Physical appearance

---

## Privacy Architecture

```
Private Questionnaire (never exposed)
        │
        ├── Matching Features (used by engine only)
        │
        ├── Public Profile (name, age, city, bio, profession)
        │
        └── Verification Data (admin-only)
```

Sensitive answers (deal-breakers, non-negotiables, open responses) are never sent to other users.

---

## Running the Demo

```bash
npx ts-node src/lib/matching/examples/demo.ts
```

This demonstrates:
1. Hard filter validation
2. Reciprocal score computation
3. Full discovery flow
4. Semantic analysis of open-ended responses
5. Match explanation generation

---

## Extending the Engine

### Adding a new scoring field

1. Add the field to the appropriate interface in `types.ts`
2. Add it to the `QuestionnaireResponse` interface
3. Add scoring logic in the relevant function in `scoring.ts`
4. Add the field to the database schema in `matching-engine-schema.sql`
5. Update the `mapQuestionnaireFromDB` function in `route.ts`

### Changing weights

Update the `matching_config` table in the database:
```sql
UPDATE matching_config 
SET weights = '{"spiritual": 0.35, "marriage_family": 0.25, "values": 0.20, "personality": 0.08, "lifestyle": 0.07, "preferences": 0.05}'
WHERE config_name = 'default';
```

### Adding new hard filters

Add validation logic in `hard-filters.ts` in the `applyHardFilters` function.