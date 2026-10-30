# Game design — phase 1

Les chiffres de ce document sont des **valeurs de départ**. La source de vérité est `data/` ; ce document explique les règles et l'intention. Si les deux divergent, on corrige ce document.

## 1. Partie MVP

- Une lane horizontale entre deux bases. Camp **Bleu** (joueur) à gauche, camp **Rouge** à droite.
- Chaque camp a deux tours sur la lane et une base avec fontaine.
- Le joueur contrôle un champion. L'équipe adverse se compose de sbires, de tours et d'une base ; il n'y a pas de champion adverse dans le MVP.
- Victoire : détruire la base adverse. Une base est invulnérable tant qu'une tour de son camp tient.

## 2. Le Nen

Le Nen est une ressource. C'est la tension centrale du jeu : chaque capacité coûte, la jauge revient lentement, et la vider coûte cher.

| Règle | Valeur de départ |
|---|---|
| Jauge maximale | 200 |
| Coût | Chaque capacité a un coût fixe (voir le champion). Les attaques de base sont gratuites. |
| En combat | Avoir infligé ou subi des dégâts d'une unité ennemie dans les 5 dernières secondes |
| Régénération | 0 en combat ; 8 par seconde hors combat |
| Fontaine | Régénère rapidement PV et Nen (10 % du maximum par seconde) |

**Épuisement.** Quand la jauge tombe à 0, le champion devient **épuisé** :
- il subit 30 % de dégâts en plus ;
- il ne peut plus lancer de capacité ;
- l'état se lève quand la jauge remonte à 25 % du maximum.

Comme la régénération est nulle en combat, un champion épuisé doit se désengager pour récupérer. C'est voulu : vider sa jauge est une décision risquée, pas un accident sans conséquence.

## 3. Spécialisations

Chaque champion a une spécialisation qui modifie **une règle** du jeu. Dans le MVP, seule l'Émission est conçue et implémentée.

| Spécialisation | Règle modifiée | Statut |
|---|---|---|
| Émission | **Aura détachée** : quand un projectile du champion touche un ennemi, il récupère 25 % du coût de la capacité qui l'a lancé, une fois par lancer. C'est le seul moyen de regagner du Nen en combat. | Validée (MVP) |
| Renforcement | Piste : l'épuisement est moins punitif et les capacités centrées sur soi coûtent moins. | Non validée |
| Transmutation | Piste : les capacités changent de propriété (brûlure, gel…) et appliquent un effet secondaire. | Non validée |
| Manipulation | Piste : prendre temporairement le contrôle d'un sbire ennemi. | Non validée |
| Conjuration | Piste : les objets conjurés ont un coût d'entretien par seconde au lieu d'un coût fixe. | Non validée |
| Spécialisation | Piste : une règle unique, propre à chaque champion. | Non validée |

Techniquement, une spécialisation est un modificateur de règle référencé dans le fichier du champion, avec ses paramètres en données. Le moteur expose des points d'accroche (coût, régénération, épuisement, impact de projectile, dégâts) sur lesquels ces modificateurs se branchent.

## 4. Champion : Ressac

Nom de travail, original. Émetteur à distance moyenne qui gère son Nen en visant juste, et qui peut tout dépenser d'un coup au prix de l'épuisement.

**Statistiques de base** (gain par niveau entre parenthèses)

| PV | Dégâts d'attaque | Vitesse d'attaque | Portée | Armure | Vitesse |
|---|---|---|---|---|---|
| 560 (+90) | 52 (+3) | 0,65 / s | 525 | 22 (+4) | 330 |

**Capacités**

| Touche | Nom | Effet | Coût | Recharge |
|---|---|---|---|---|
| — | Aura détachée | Règle d'Émission (voir §3) | — | — |
| A | Trait | Projectile en ligne droite (portée 900, vitesse 1 600) qui s'arrête au premier ennemi touché. 70 dégâts (+10 par niveau). | 30 | 4 s |
| Z | Glissement | Dash de 350 unités vers le curseur. S'arrête contre un obstacle. | 25 | 10 s |
| E | Orbe émis | Pose un orbe à l'emplacement visé (portée 600). Pendant 4 s, il tire toutes les 0,8 s sur l'ennemi le plus proche à moins de 500 unités, 25 dégâts par tir (+4 par niveau). Ses tirs sont des projectiles, donc déclenchent Aura détachée. | 50 | 12 s |
| R | Décharge | Canalise 1 s, puis tire un rayon de 1 400 × 120 unités. Consomme **tout** le Nen restant (60 minimum requis) ; dégâts = 100 + 1,5 × Nen consommé. Laisse toujours le champion épuisé. Débloquée au niveau 6. | Tout | 60 s |

## 5. Combat

- Dégâts subis = dégâts bruts × 100 / (100 + armure) × multiplicateurs (dont l'épuisement, ×1,3).
- Réapparition à la fontaine après 6 s + 1,5 s par niveau du champion.
- Armure minimale : 0 dans le MVP (pas de réduction d'armure).

## 6. Sbires, tours, base

| Unité | PV | Dégâts | Portée | Vitesse d'attaque | Or (dernier coup) | XP |
|---|---|---|---|---|---|---|
| Sbire mêlée | 450 | 12 | 110 | 1 / s | 21 | 60 |
| Sbire distance | 300 | 23 | 550 | 0,8 / s | 14 | 30 |
| Tour | 3 000 | 150 | 750 | 0,8 / s | 150 | 100 |
| Base | 4 000 | — | — | — | — | — |

- Vague : 3 sbires mêlée puis 3 sbires distance, toutes les 30 s, première vague à 15 s.
- Priorité de ciblage des sbires : la cible ennemie la plus proche dans leur rayon d'acquisition, en préférant sbires et tours au champion.
- Priorité de ciblage des tours : les sbires ennemis à portée (le plus proche d'abord), puis le champion.
- L'XP d'une unité tuée est partagée entre les champions alliés à moins de 1 400 unités, même sans dernier coup.

## 7. Économie et progression

- Or de départ : 500. Or passif : 2 par seconde.
- Niveaux 1 à 12, seuils d'XP dans une table en données.
- Mini-boutique accessible uniquement à la fontaine : 3 ou 4 objets de statistiques (PV, dégâts, Nen maximal, régénération de Nen).

## 8. Contrôles (style MOBA classique)

Les touches sont lues par **position physique** : sur un clavier AZERTY, A Z E R correspondent aux positions Q W E R d'un clavier QWERTY. Tous les raccourcis sont dans `data/input/`.

| Action | Entrée |
|---|---|
| Se déplacer | Clic droit sur le sol |
| Attaquer | Clic droit sur un ennemi (poursuite automatique) |
| Capacités | A, Z, E, R (lancement rapide vers le curseur à l'appui) |
| Stop | S |
| Verrouiller / libérer la caméra | Y |
| Recentrer la caméra | Espace maintenu |
| Défiler (caméra libre) | Souris au bord de l'écran |
| Boutique (à la fontaine) | P |
| Pause | Échap |
