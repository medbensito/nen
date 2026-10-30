# CLAUDE.md — nen

Instructions pour tout agent (Claude, Codex…) et tout humain qui travaille sur ce dépôt.
Lis ce fichier en entier avant toute tâche, puis `docs/ROADMAP.md` pour savoir quel jalon est en cours.

## Vision

`nen` est un MOBA 5v5 en 2D vue du dessus, jouable dans le navigateur, inspiré de l'univers de Hunter x Hunter.

- Deux équipes, une base chacune, des lanes, des sbires, des tours et un objectif central.
- Mécanique centrale : le **Nen**, une énergie vitale gérée par une jauge. Chaque capacité en consomme, la jauge se régénère lentement hors combat, et son épuisement rend le champion vulnérable.
- Chaque champion a une **spécialisation Nen** (Renforcement, Transmutation, Émission, Manipulation, Conjuration, Spécialisation) qui modifie une règle de son style de jeu.
- Contenu 100 % original : aucun asset, musique, nom de personnage ou de lieu, ni design officiel de l'œuvre.

Phase 1 = MVP solo jouable (une lane, un champion, sbires et tours, boucle de partie complète). Pas de multijoueur dans le MVP, mais l'architecture le prépare : la logique de jeu est séparée du rendu et des entrées.

Détails de design : `docs/GAME_DESIGN.md`. Jalons et critères d'acceptation : `docs/ROADMAP.md`. Décisions structurantes : `docs/decisions/`.

## Stack

- **TypeScript** (strict, ESM), monorepo **pnpm** workspaces.
- **Phaser 4** (WebGL2) pour le rendu, les entrées et l'audio, uniquement dans `packages/client`.
- **Vite** pour le serveur de dev et le build.
- **Vitest** pour les tests, **zod** pour valider les fichiers de données, **ESLint** (typescript-eslint) et **Prettier**.
- **Playwright** pour un test de fumée dans le navigateur.

Phaser 4 est sorti en avril 2026 et son API de rendu diffère de Phaser 3. Vérifie les exemples Phaser 3 trouvés en ligne avant de les reprendre ; la référence est la doc v4 et le dossier `skills/` du dépôt officiel Phaser.

## Commandes

Prérequis : Node.js 22 LTS ou plus récent (24 recommandé), pnpm 10 (`npm install -g pnpm`), git.
Ces commandes existent à partir du jalon M0. Si l'une d'elles change, mets à jour cette section dans le même commit.

| Commande | Effet |
|---|---|
| `pnpm install` | Installe les dépendances de tout le monorepo |
| `pnpm dev` | Lance le jeu en dev sur http://localhost:5173 |
| `pnpm test` | Lance tous les tests une fois |
| `pnpm test <filtre>` | Lance seulement les fichiers de test dont le chemin contient `<filtre>` (ex. `pnpm test nen`) |
| `pnpm test:watch` | Tests en mode surveillance |
| `pnpm test:e2e` | Test de fumée Playwright (la page charge, aucune erreur console) |
| `pnpm typecheck` | Vérification des types |
| `pnpm lint` | ESLint, y compris les règles d'isolation de `sim` |
| `pnpm validate:data` | Valide tous les fichiers de `data/` contre leurs schémas |
| `pnpm bench` | Benchmarks de la simulation |
| `pnpm build` | Build de production du client dans `packages/client/dist` |
| `pnpm check` | `typecheck` + `lint` + `validate:data` + `test`. **Doit passer avant chaque commit.** |

## Structure

```
nen/
├── CLAUDE.md                 ce fichier
├── AGENTS.md                 renvoi vers ce fichier (Codex et autres agents)
├── README.md
├── docs/
│   ├── ROADMAP.md            jalons, critères d'acceptation, statut
│   ├── GAME_DESIGN.md        règles du Nen, champions, contrôles, valeurs de départ
│   └── decisions/            décisions structurantes (une par fichier, NNNN-titre.md)
├── data/                     tout le contenu équilibrable, en JSON (voir data/README.md)
│   ├── champions/
│   ├── abilities/
│   ├── units/                sbires, tours, bases
│   ├── items/
│   ├── maps/
│   ├── rules/                Nen, économie, partie, fréquence de simulation
│   ├── input/                raccourcis clavier et souris
│   └── locales/              tous les textes affichés (fr, en)
├── packages/
│   ├── sim/                  @nen/sim : règles du jeu, TypeScript pur
│   │   ├── src/
│   │   │   ├── core/         boucle à pas fixe, RNG à graine, ids, maths (vec2)
│   │   │   ├── schema/       schémas zod des fichiers de data/ et chargeur
│   │   │   ├── state/        types de l'état de jeu (sérialisable)
│   │   │   ├── commands/     commandes entrantes (Move, Attack, Cast, Stop…)
│   │   │   ├── systems/      movement, combat, nen, abilities, ai, waves, economy, match
│   │   │   └── nav/          grille de navigation, A*, lissage de chemin
│   │   └── test/             scénarios et tests d'intégration (parties complètes)
│   │       └── fixtures/     données de test inline, indépendantes de data/
│   └── client/               @nen/client : Phaser 4
│       ├── src/
│       │   ├── scenes/
│       │   ├── render/       vues synchronisées depuis l'état de la sim
│       │   ├── input/        souris et clavier → commandes
│       │   └── ui/           HUD
│       └── public/
└── tools/                    scripts Node (validation des données, benchmarks)
```

Plus tard : `packages/server/` (serveur autoritaire Node qui exécute `@nen/sim`).

## Règles d'architecture (non négociables)

1. **`sim` est pure.** Aucun import de Phaser, du DOM ou d'API navigateur (`window`, `document`). Pas de `Math.random`, `Date.now`, `performance.now`, `setTimeout`. Le temps se compte en ticks, l'aléatoire passe par le RNG à graine du contexte. ESLint bloque ces imports et ces appels dans `packages/sim`.
2. **Un seul sens de circulation** : entrées → commandes → `sim.step()` → état → rendu. Le client lit l'état et envoie des commandes ; il ne modifie jamais l'état. C'est ce flux qui permettra d'envoyer les commandes à un serveur plus tard.
3. **L'état est de la donnée** : sérialisable en JSON (objets, tableaux, nombres, chaînes, booléens), sans classes à méthodes ni références circulaires. Les entités sont identifiées par des ids entiers et parcourues par id croissant.
4. **Déterminisme** : mêmes données + même graine + mêmes commandes ⇒ même état, tick par tick. Un test le vérifie par hash d'état. On vise des tests reproductibles et des replays, pas un lockstep multi-plateforme.
5. **Aucune valeur de gameplay dans le code.** Stats, coûts, durées, portées, priorités de l'IA, tables d'or et d'XP, raccourcis : tout vient de `data/`. Seules les constantes techniques (epsilon, tailles de buffer) vivent dans le code.
6. **Les données sont validées au chargement** par les schémas zod de `packages/sim/src/schema/`. Le chargeur reçoit des objets bruts (il ne lit pas de fichiers) pour rester utilisable dans le navigateur, dans Node et sur un futur serveur. Une erreur nomme le fichier et le chemin du champ fautif. Ajouter un champ de données = mettre à jour le schéma et ajouter un test.
7. **Aucun texte affiché en dur.** Tout passe par `data/locales/`. Les identifiants du code restent en anglais ; les noms affichés (y compris « Nen » et les six spécialisations) sont des clés de traduction, donc renommables sans toucher au code.

## Simulation et performance

- Simulation à pas fixe, 30 ticks par seconde (valeur dans `data/rules/`). Rendu à 60 fps avec interpolation entre deux ticks.
- Cible : 60 fps dans Chrome et Firefox sur un ordinateur de bureau moyen.
- Budget : `sim.step()` sous 2 ms avec 100 unités actives, mesuré par `pnpm bench`.
- Dans les boucles chaudes, évite d'allouer par entité et par tick. Côté client, les objets Phaser sont mis en pool, pas recréés à chaque frame.
- Le 60 fps réel se valide à la main sur une vraie machine : un navigateur headless n'a pas de GPU représentatif.

## Unités dans les données

| Grandeur | Unité |
|---|---|
| Distance, portée, rayon | unités de monde (1 unité = 1 pixel au zoom 1) |
| Durée, temps de recharge | secondes |
| Vitesse | unités par seconde |
| Régénération | points par seconde |
| Multiplicateur | décimal (`1.3` = +30 %) |
| Part d'un maximum | fraction de 0 à 1 (`0.25` = 25 %) |
| Angle | degrés (convertis en radians au chargement) |

Le chargeur convertit les secondes en ticks ; le code de la sim ne manipule que des ticks.

## Conventions de code

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Pas de `any` : `unknown` puis validation aux frontières.
- Fichiers en `kebab-case.ts`. Types en `PascalCase`, fonctions et variables en `camelCase`, vraies constantes en `SCREAMING_SNAKE_CASE`.
- Ids de données en `kebab-case` (`ressac`, `ressac-trait`), clés JSON en `camelCase`.
- Code, identifiants, commentaires et messages de commit en anglais. Documentation (`docs/`, ce fichier, `data/README.md`) en français.
- Fonctions pures autant que possible. Un système a la forme `(state: GameState, ctx: TickContext) => void`. Pas d'état global mutable, pas de singleton.
- Les commentaires expliquent le *pourquoi*, pas le *quoi*.
- Le style n'est pas un sujet de discussion : Prettier et ESLint tranchent, `pnpm check` fait foi.
- Dépendances : `sim` n'a que zod en dépendance d'exécution. Toute nouvelle dépendance d'exécution (dans `sim` ou `client`) se justifie dans le rapport de jalon.

## Tests

- Vitest. Tests unitaires à côté du code (`foo.ts` → `foo.test.ts`). Scénarios et parties complètes dans `packages/sim/test/`.
- Toute règle de `sim` est couverte par un test. Une correction de bug commence par un test qui reproduit le bug.
- **Les tests de règles utilisent leurs propres données** (`packages/sim/test/fixtures/`), jamais les valeurs de `data/` : rééquilibrer le jeu ne doit casser aucun test de règle. Un test séparé vérifie que tous les fichiers de `data/` sont valides.
- Le rendu n'a pas de tests unitaires. Le test de fumée Playwright vérifie que la page charge sans erreur console.

## Méthode de travail

1. **Un jalon à la fois**, dans l'ordre de `docs/ROADMAP.md`. Ne commence jamais le jalon suivant sans validation explicite du porteur du projet.
2. **Avant de coder un jalon**, pose les questions bloquantes. Pour le reste, fais un choix raisonnable et signale-le (« Choix signalé : … ») dans le rapport et dans la PR.
3. **Branches** : `m<N>-<slug>` créée depuis `main` (ex. `m1-movement-camera`). PR vers `main` en fin de jalon. Après validation : merge, tag `m<N>`, statut mis à jour dans `docs/ROADMAP.md`.
4. **Rapport de fin de jalon**, toujours avec ces rubriques :
   - **Fait** : ce qui est livré.
   - **Pas fait** : ce qui manque ou est reporté, et pourquoi.
   - **Comment tester** : commandes à lancer et manipulations manuelles.
   - **Critères d'acceptation** : chacun coché ou non, avec le test qui le prouve.
   - **Choix signalés** : décisions prises sans validation préalable.
5. **Décisions structurantes** (architecture, dépendance, format de données) : un court fichier `docs/decisions/NNNN-titre.md` avec contexte, décision et conséquences.

## Commits

Conventional Commits, en anglais, à l'impératif, 72 caractères maximum pour la première ligne.

- Types : `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.
- Scopes : `sim`, `client`, `data`, `tools`, `docs`, `repo`.
- Un changement logique par commit, et `pnpm check` passe sur chaque commit.

Exemples :
```
feat(sim): add fixed-step game loop with seeded rng
test(sim): cover nen regen delay after leaving combat
feat(data): add ressac champion and abilities
fix(client): keep camera locked after respawn
```

## Propriété intellectuelle

Projet de fan non officiel. Personnages, capacités, sbires, tours, cartes, visuels et sons sont originaux. N'importe aucun asset, musique, nom ou design officiel de Hunter x Hunter, même provisoirement. Les termes de mécanique repris du cahier des charges (Nen, les six spécialisations) ne sont affichés que via `data/locales/`.
