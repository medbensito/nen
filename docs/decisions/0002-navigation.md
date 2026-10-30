# 0002 — Navigation : grille gonflée, A* et lissage

- Statut : acceptée (2026-10-30, jalon M1)

## Contexte

Le champion doit contourner les murs au clic droit. Les sbires (M4) auront besoin du même service. Contraintes : déterministe, rapide (un chemin par ordre, et un ordre toutes les 0,15 s quand le bouton reste enfoncé), testable sans rendu, et décrit entièrement par les données de la carte.

## Décision

- **Obstacles** : rectangles alignés sur les axes dans `data/maps/<id>.json`. Les bords de la carte sont des murs.
- **Grille** : la taille de cellule vient de la carte (`navCellSize`, 25 unités pour la lane). Pour chaque rayon d'agent, une grille est construite une fois en « gonflant » les obstacles et les bords de ce rayon. L'agent devient alors un point. Ces grilles sont dérivées des données : elles vivent à côté de l'état, pas dedans.
- **Recherche** : A* sur 8 directions, sans couper les coins (une diagonale exige que les deux cellules qu'elle frôle soient libres). Départage déterministe des égalités.
- **Lissage** : on garde seulement les virages, en vérifiant la ligne de vue cellule par cellule (traversée d'Amanatides–Woo).
- **Cibles** : une cible dans un mur devient le point accessible le plus proche. Une cible hors de la carte est ramenée sur la carte. Une cible inatteignable (zone fermée) laisse l'ordre en cours intact.

## Conséquences

- Le centre d'un agent reste au moins à `rayon − demi-diagonale de cellule` d'un mur (environ 17 unités pour Ressac) : le corps peut frôler un mur de quelques unités, jamais le traverser. Le test des 1 000 déplacements aléatoires vérifie cette borne.
- Coût mesuré (`pnpm bench`) : un chemin qui traverse toute la lane prend environ 0,6 ms en moyenne et 1,2 ms au p95.
- Seuls les rectangles sont gérés. Des obstacles ronds ou polygonaux demanderaient une nouvelle décision.
- Pas encore de collision entre unités : elle arrivera avec les sbires (M4), sous forme d'évitement local plutôt que dans la grille.
