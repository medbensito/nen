# 0004 — Capacités, Nen et règles de spécialisation

- Statut : acceptée (2026-10-30, jalon M3)

## Contexte

Le Nen est la mécanique centrale. Chaque capacité en consomme, et la spécialisation de chaque champion modifie une règle du jeu. Il faut pouvoir ajouter des champions et rééquilibrer sans toucher au code, et chaque règle doit rester testable.

## Décision

- **Capacités en données** (`data/abilities/<id>.json`) : un coût (fixe, ou tout le Nen restant avec un minimum), un temps de recharge, un niveau de déblocage et un **effet** choisi parmi des types génériques. M3 en implémente quatre, ceux dont Ressac a besoin :
  - `skillshot` : projectile en ligne droite ;
  - `dash` ;
  - `turret` : orbe qui tire seul ;
  - `beam` : rayon canalisé.

  Un nouveau type d'effet demande du code : c'est voulu, chaque type a ses tests.
- **Validation avant dépense** : un lancer est refusé s'il n'est pas débloqué, si le champion est occupé (canalisation, dash), en recharge, épuisé ou à court de Nen. Il produit alors un événement `cast-rejected` avec sa raison, et rien n'est consommé.
- **Canalisation** : le Nen n'est dépensé qu'au déclenchement. Un nouvel ordre annule la canalisation sans coût ni temps de recharge.
- **Combat et régénération** : infliger ou subir des dégâts d'un ennemi met les deux camps « en combat » pour une durée lue dans les données, ce qui coupe la régénération.
- **Épuisement** : il commence quand une dépense vide la jauge. Le champion subit alors plus de dégâts et ne peut plus lancer de capacité, jusqu'à ce que la jauge revienne au seuil de récupération.
- **Spécialisations** : chaque champion déclare une `rule` avec un `kind` et ses paramètres. Chaque `kind` est un point d'accroche précis dans la sim. Le premier est `projectile-hit-refund` (Émission, Aura détachée) : à l'impact d'un projectile de capacité, une part du coût revient au lanceur, une fois par lancer.

## Conséquences

- Les effets « zone » et « ralentissement » prévus dans la roadmap ne sont pas implémentés : aucune capacité ne s'en sert encore. Ils arriveront avec le champion qui en aura besoin.
- Les projectiles linéaires passent au-dessus des murs, comme les projectiles à tête chercheuse.
- Les orbes n'ont pas de vie : on ne peut pas les cibler.
- Les cinq autres spécialisations ont chacune une piste dans `docs/GAME_DESIGN.md`. Chacune deviendra un nouveau `kind` quand son premier champion arrivera.
