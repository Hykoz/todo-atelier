# Mes tâches — application de l’atelier

Une application de gestion de tâches (back Node/Express, front HTML/JS, base PostgreSQL), fournie pour l’atelier sécurité applicative.

## Règle d’or

Les techniques vues dans cet atelier ne s’appliquent **qu’à cette application, en local**. Ne les essayez jamais sur une application que vous n’avez pas l’autorisation explicite de tester (articles 323-1 et suivants du Code pénal).

## Lancer l’application

Prérequis : Docker et Docker Compose.

```
docker compose up --build
```

- Application : http://localhost:8080
- API seule : http://localhost:3000/api/health

Comptes de démonstration (créés automatiquement) :

| Utilisateur | Mot de passe |
|---|---|
| admin | admin123 |
| alice | password1 |
| bob   | qwerty |

Vous pouvez aussi créer votre propre compte depuis l’onglet « Inscription ».

## Ce que fait l’application

- Créer un compte, se connecter.
- Ajouter, modifier, cocher et supprimer des tâches personnelles.
- Rechercher dans ses tâches.
- Le compte `admin` a accès à un écran d’administration des comptes.

## Pour l’exercice 1 (prise en main)

Parcourez chaque page et chaque fonction avant de chercher la moindre faille. Notez, pour vous-même :

- Les pages et boutons disponibles.
- Les formulaires (ce qu’on peut y saisir).
- Ce qui change selon le compte utilisé (`admin` vs un compte normal).

## Pour relancer depuis zéro

```
docker compose down -v
docker compose up --build
```

(`-v` supprime aussi les données de la base, pour repartir avec les comptes de démonstration d’origine.)
