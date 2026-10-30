# nen

MOBA 2D en vue du dessus, jouable dans le navigateur, dont la mécanique centrale est le Nen : une énergie vitale que chaque capacité consomme et dont l'épuisement rend le champion vulnérable.

> Projet de fan non officiel, sans lien avec les ayants droit de Hunter x Hunter. Personnages, visuels et sons sont originaux.

## Statut

Phase 1 (MVP solo) en préparation. Avancement : [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Démarrer (à partir du jalon M0)

Prérequis : Node.js 22 LTS ou plus récent, pnpm 10, git.

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm check    # types, lint, données, tests
```

## Documentation

- [`CLAUDE.md`](CLAUDE.md) : conventions, architecture, commandes, méthode de travail
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) : règles du Nen, champion, contrôles
- [`docs/ROADMAP.md`](docs/ROADMAP.md) : jalons et critères d'acceptation
- [`data/README.md`](data/README.md) : équilibrer le jeu sans toucher au code
