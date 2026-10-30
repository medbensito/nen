# data/

Tout le contenu équilibrable du jeu vit ici, en JSON. Changer une valeur dans ces fichiers change le jeu, sans toucher au code.

| Dossier | Contenu |
|---|---|
| `champions/` | Un fichier par champion : statistiques, gains par niveau, spécialisation, capacités |
| `abilities/` | Définition des capacités : effets, coûts, temps de recharge, portées |
| `units/` | Sbires, tours, bases |
| `items/` | Objets de la boutique |
| `maps/` | Cartes : lane, bases, fontaines, obstacles, positions des tours |
| `rules/` | Règles globales : Nen, combat, économie, vagues, fréquence de simulation |
| `input/` | Raccourcis clavier et souris (par position physique de touche) |
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
