# data/

Tout le contenu équilibrable du jeu vit ici, en JSON. Changer une valeur dans ces fichiers change le jeu, sans toucher au code.

| Dossier | Contenu |
|---|---|
| `champions/` | Un fichier par champion : statistiques, attaque, Nen maximal, spécialisation et sa règle, quatre capacités |
| `abilities/` | Une capacité par fichier : coût en Nen (fixe, ou `{ "allRemaining": true, "minimum": … }`), temps de recharge, niveau de déblocage, effet (`skillshot`, `dash`, `turret`, `beam`) |
| `units/` | Unités autres que les champions : mannequin d'entraînement (M2), puis sbires, tours, bases |
| `items/` | Objets de la boutique |
| `maps/` | Cartes : obstacles, bases et fontaines, unités placées dès le départ (mannequin, plus tard tours) |
| `rules/` | Règles globales : `simulation.json` (fréquence), `match.json` (carte, champion et camp du joueur), `combat.json` (échelle d'armure, délai de réapparition, régénération à la fontaine), `nen.json` (durée du combat, régénération, épuisement) ; plus tard économie, vagues |
| `input/` | `bindings.json` : raccourcis (par position physique de touche) ; `camera.json` : verrouillage au départ, défilement, zoom |
| `locales/` | Tous les textes affichés, par langue (`fr.json`, `en.json`) |

## Équilibrer

1. Modifie la valeur dans le fichier JSON.
2. Lance `pnpm validate:data` : chaque erreur nomme le fichier et le champ fautif.
3. Relance le jeu (`pnpm dev` recharge tout seul).

## Unités

Distances en unités de monde (1 unité = 1 pixel au zoom 1), durées en secondes, vitesses en unités par seconde, régénérations en points par seconde, multiplicateurs en décimal (`1.3` = +30 %), parts d'un maximum en fraction (`0.25` = 25 %), angles en degrés.

## Conventions

- Ids en `kebab-case` (`ressac`, `ressac-trait`), clés en `camelCase`.
- Aucun texte affiché dans ces fichiers hors de `locales/` : les autres fichiers référencent des clés de traduction.
