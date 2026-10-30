# 0003 — Modèle de combat : attaques, projectiles, événements

- Statut : acceptée (2026-10-30, jalon M2)

## Contexte

M2 introduit l'attaque de base, la mort et la réapparition. Les capacités de M3, les sbires et les tours de M4 réutiliseront ces briques. Il faut un modèle simple, déterministe, entièrement réglé par les données, et que le client puisse mettre en scène (chiffres de dégâts, effets) sans lire l'état de façon détournée.

## Décision

- **Portée** mesurée de bord à bord des deux corps.
- **Cadence** : une attaque démarre au plus une fois par période (`1 / perSecond`, en ticks). Elle commence par un wind-up (`windup` × période), puis l'attaque touche directement ou lance un projectile. Un ordre de déplacement ou d'arrêt pendant le wind-up annule l'attaque et rend son temps de recharge.
- **Projectiles** : à tête chercheuse, ils touchent toujours, sauf si la cible meurt avant l'impact. Les dégâts s'appliquent à l'impact.
- **Armure** : dégâts × échelle / (échelle + armure). L'échelle (100) est dans `data/rules/combat.json`.
- **Pas d'attaque automatique** : une entité n'attaque que sa cible désignée par un ordre ou par son IA (riposte du mannequin, puis IA des sbires et des tours en M4).
- **Mort** : l'entité reste dans l'état, marquée `deadUntil`, jusqu'à sa réapparition à son point d'origine avec toute sa vie. Une entité sans réapparition est retirée à la fin du tick.
- **Événements** : chaque `step()` produit une liste d'événements (attaque, dégâts, mort, réapparition) lue par le client. Ce ne sont pas des données d'état : rejouer les mêmes commandes les reproduit à l'identique.

## Conséquences

- Les tests vérifient la cadence, le wind-up, le temps de vol et les dégâts au tick près.
- Le client affiche les dégâts sans comparer deux états successifs.
- Les capacités de M3 pourront réutiliser `dealDamage` et les projectiles.
- Un projectile ne peut pas rater sa cible : des tirs qui se visent à la main (skillshots) demanderont un autre type de projectile, en M3 si une capacité en a besoin.
