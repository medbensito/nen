# 0001 — Stack : Phaser 4 + TypeScript, simulation séparée

- Statut : acceptée (2026-10-30)

## Contexte

MVP d'un MOBA 2D vue du dessus, jouable dans le navigateur en priorité. Contraintes : logique de jeu testée automatiquement et séparée du rendu, multijoueur possible plus tard, 60 fps sur un ordinateur de bureau moyen, équilibrage entièrement en données. Le code est écrit en grande partie par des agents, qui doivent pouvoir vérifier leur travail eux-mêmes.

Options étudiées : Phaser 4 + TypeScript, Godot 4.7 en GDScript (l'export web de Godot n'est pas disponible pour les projets C#).

## Décision

- Phaser 4 + TypeScript, monorepo pnpm, Vite, Vitest.
- Les règles vivent dans `@nen/sim`, en TypeScript pur, sans dépendance de rendu. Le client Phaser lit l'état et envoie des commandes.
- Simulation à pas fixe, déterministe à graine.

## Conséquences

- Les règles se testent en quelques millisecondes dans Node, sans moteur.
- Le même package de simulation pourra tourner sur un serveur Node autoritaire, sans réécriture des règles.
- Pas d'éditeur de niveaux : la carte est un fichier de données.
- Pathfinding, collisions de gameplay et IA sont écrits dans `sim`, ce qui les rend testables.
- Risque : Phaser 4 est récent (avril 2026). Comme seul `packages/client` l'importe, un repli sur Phaser 3.90 ou PixiJS ne toucherait que le rendu.
