# Roadmap — phase 1 (MVP jouable)

Un jalon à la fois. Le suivant ne démarre qu'après validation explicite du porteur du projet (voir `CLAUDE.md`, « Méthode de travail »).

Légende des critères : **(auto)** = test automatisé qui tourne dans `pnpm check`, **(bench)** = `pnpm bench`, **(manuel)** = vérification à la main dans le navigateur.

## Statut

| Jalon | Sujet | Statut |
|---|---|---|
| M0 | Scaffolding | Fait (tag `m0`) |
| M1 | Déplacement et caméra | Fait (tag `m1`) |
| M2 | Combat de base | Fait (tag `m2`) |
| M3 | Nen et capacités | En cours |
| M4 | Sbires, tours, or et niveaux | À faire |
| M5 | Boucle de partie complète | À faire |

---

## M0 — Scaffolding

**Livré**
- Monorepo pnpm : `packages/sim`, `packages/client`, `data/`, `tools/`.
- TypeScript strict, ESLint (avec les règles d'isolation de `sim`), Prettier, Vitest, Vite, Playwright.
- Boucle de simulation à pas fixe (30 ticks/s) avec RNG à graine et hash d'état.
- Chargeur de données avec schémas zod : `data/rules/` (simulation, match), `data/maps/`, `data/locales/`.
- Client Phaser 4 qui affiche une arène vide, la grille du monde et un compteur FPS.
- Toutes les commandes listées dans `CLAUDE.md`.

**Critères d'acceptation**
- [x] `pnpm install` puis `pnpm dev` ouvre l'arène vide avec le compteur FPS. (manuel — validé par le porteur du projet)
- [x] `pnpm check` passe. (auto)
- [x] Un import de `phaser` ou un appel à `Math.random` dans `packages/sim` fait échouer `pnpm lint`. (auto : `tools/lint-rules.test.ts`)
- [x] Un fichier de données invalide produit une erreur qui nomme le fichier et le chemin du champ. (auto : `packages/sim/src/schema/loader.test.ts`, `tools/validate-data.test.ts` ; l'erreur s'affiche aussi dans le navigateur)
- [x] Deux simulations avec la même graine et les mêmes commandes ont le même hash d'état après 1 000 ticks. (auto : `packages/sim/test/determinism.test.ts`)
- [x] `pnpm test:e2e` : la page charge sans erreur console, et la sim tient sa fréquence de ticks. (auto, hors `pnpm check`)

## M1 — Déplacement et caméra

**Livré**
- Carte décrite en données : une lane, deux bases avec fontaine, obstacles.
- Grille de navigation dérivée de la carte, A* et lissage de chemin.
- Clic droit sur le sol : le champion s'y déplace en contournant les obstacles. Marqueur de clic. `S` : stop.
- Caméra : verrouillée sur le champion au départ (`Y` pour basculer), défilement aux bords de l'écran quand elle est libre, `Espace` maintenu pour recentrer, zoom à la molette entre deux bornes.
- Raccourcis lus par position physique de touche, définis dans `data/input/`.

**Critères d'acceptation**
- [x] Le chemin trouvé contourne un obstacle ; un clic dans un mur envoie au point accessible le plus proche ; une cible inaccessible ne produit pas de déplacement. (auto : `nav/pathfinding.test.ts`, `systems/movement.test.ts`)
- [x] Modifier `moveSpeed` dans le JSON du champion change la vitesse, sans toucher au code. (auto : `systems/movement.test.ts`)
- [x] Sur 1 000 déplacements à destination aléatoire, le champion ne traverse jamais un obstacle. (auto : `test/random-moves.test.ts`)
- [x] Changer un raccourci dans `data/input/` change la touche en jeu. (auto : `input/key-bindings.test.ts`)
- [x] Déplacement fluide et 58 fps ou plus sur la machine de référence. (manuel — validé par le porteur du projet ; en headless, le thread principal prend environ 2 ms par frame, vérifié par `e2e/movement.spec.ts`)

## M2 — Combat de base

**Livré**
- Statistiques : PV, dégâts d'attaque, vitesse d'attaque, portée, armure.
- Clic droit sur un ennemi : poursuite puis attaques de base (projectile pour un champion à distance).
- Barres de vie, mort, réapparition à la fontaine après un délai défini en données.
- Mannequin d'entraînement dans la lane.

Réponses prises en compte : le mannequin riposte, pas d'attaque automatique, chiffres de dégâts flottants.

**Critères d'acceptation**
- [x] Les dégâts suivent la formule documentée dans `docs/GAME_DESIGN.md`, armure comprise. (auto : `systems/damage.test.ts`, `systems/combat.test.ts`)
- [x] La cadence est respectée : N attaques en T secondes selon la vitesse d'attaque. (auto : `systems/combat.test.ts`, 1 et 2 attaques/s)
- [x] Hors de portée, le champion poursuit puis attaque dès qu'il est à portée. (auto : `systems/combat.test.ts`)
- [x] À 0 PV, l'unité meurt ; le champion réapparaît à la fontaine après le délai lu dans les données. (auto : `systems/respawn.test.ts`)
- [x] Attaquer le mannequin est lisible : barres, impacts, mort, réapparition. (manuel — validé par le porteur du projet ; couvert aussi par `e2e/combat.spec.ts`)

## M3 — Nen et capacités

**Livré**
- Jauge de Nen : maximum, coûts, état « en combat », régénération hors combat, épuisement.
- Système de capacités composé d'effets génériques décrits en données : projectile, dash, zone, invocation, rayon, dégâts, ralentissement.
- Règle de spécialisation branchée sur le système (première règle : Émission, « Aura détachée »).
- Les quatre capacités de Ressac (voir `docs/GAME_DESIGN.md`).
- HUD : PV, jauge de Nen, icônes de capacités avec temps de recharge et état « pas assez de Nen ».

**Critères d'acceptation**
- [ ] Une capacité est refusée, sans rien consommer, si le Nen est insuffisant, si elle est en recharge ou si le champion est épuisé. (auto)
- [ ] La régénération ne démarre qu'après le délai hors combat défini en données. (auto)
- [ ] À 0 Nen, l'épuisement applique ses effets (dégâts subis augmentés, capacités bloquées) et se lève au seuil prévu. (auto)
- [ ] Aura détachée rend la part prévue du coût quand un projectile touche, une fois par lancer ; un test sans la règle prouve la différence. (auto)
- [ ] Changer un coût ou un temps de recharge dans le JSON change le comportement, sans toucher au code. (auto)
- [ ] Les quatre capacités sont jouables et lisibles à l'écran. (manuel)

## M4 — Sbires, tours, or et niveaux

**Livré**
- Vagues périodiques de sbires (mêlée et distance) pour les deux camps.
- IA des sbires : suivre la lane, choisir une cible selon une priorité définie en données.
- Tours avec priorité de ciblage et projectiles.
- Or au dernier coup et or passif, expérience partagée dans un rayon, niveaux avec statistiques par niveau.
- Déblocage de la capacité R au niveau prévu.

**Critères d'acceptation**
- [ ] Une vague apparaît à l'intervalle défini en données. (auto)
- [ ] Un sbire choisit sa cible selon l'ordre de priorité défini. (auto)
- [ ] Une tour cible les sbires avant le champion. (auto)
- [ ] Or au dernier coup, XP partagée dans le rayon et passages de niveau conformes aux tables. (auto)
- [ ] `sim.step()` reste sous 2 ms avec 100 unités actives. (bench)
- [ ] Trois vagues simultanées à 58 fps ou plus sur la machine de référence. (manuel)

## M5 — Boucle de partie complète

**Livré**
- Bases destructibles une fois les tours de leur camp tombées ; victoire et défaite.
- Écran de fin et relance de partie, pause.
- Mini-boutique à la fontaine : 3 ou 4 objets de statistiques définis en données.
- HUD complet : or, niveau, chronomètre.

**Critères d'acceptation**
- [ ] Une base est invulnérable tant qu'une tour de son camp tient. (auto)
- [ ] Détruire la base adverse déclenche la victoire, perdre la sienne la défaite. (auto)
- [ ] Acheter un objet retire l'or et applique ses statistiques ; l'achat est refusé hors fontaine ou sans assez d'or. (auto)
- [ ] Un script de test simule une partie entière sans rendu, jusqu'à la fin, sans erreur. (auto)
- [ ] Une partie complète est jouable du début à la victoire. (manuel)

---

## Après le MVP (non planifié)

Ordre indicatif, à valider le moment venu :
1. Champion adverse piloté par une IA.
2. Objectif central et carte à plusieurs lanes.
3. Autres champions et spécialisations.
4. Multijoueur : `packages/server`, serveur autoritaire Node qui exécute `@nen/sim`.
5. Direction artistique et assets originaux, audio.
6. Version desktop (wrapper type Tauri).
