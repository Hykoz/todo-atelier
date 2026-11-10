# Documentation — Application Mes Tâches

## Fonctionnalités de l'application

- **Inscription et connexion** : création de compte et authentification par jeton JWT.
- **Gestion des tâches** :
  - Ajouter une tâche (titre et description).
  - Modifier le titre d'une tâche.
  - Cocher / décocher une tâche comme terminée.
  - Supprimer une tâche.
- **Recherche** : filtrer ses tâches par mot-clé dans le titre.
- **Administration** (réservé au rôle `admin`) :
  - Voir la liste des comptes utilisateurs.
  - Supprimer un compte utilisateur.

---

## Correctifs de sécurité réalisés

- **Injection SQL** (`back/src/routes/todos.js`) :
  - Utilisation de requêtes préparées (`$1`, `$2`) sur la recherche de tâches au lieu de la concaténation SQL.
- **Contrôle d'accès sur les tâches / IDOR** (`back/src/routes/todos.js`) :
  - Vérification du `user_id` lors de la lecture, modification et suppression d'une tâche pour empêcher l'accès aux tâches d'autrui.
- **Failles XSS** (`front/public/app.js`) :
  - Remplacement de `innerHTML` par `textContent` dans la recherche, la liste des tâches et le tableau d'administration.
- **Mots de passe et JWT** (`back/src/auth.js`, `db/init.sql`, `docker-compose.yml`) :
  - Remplacement du hachage MD5 par `scrypt` avec sel aléatoire.
  - Ajout d'une expiration (`2h`) et d'une clé secrète forte pour les jetons JWT.
- **Authentification et privilèges** (`back/src/routes/auth.js`) :
  - Blocage de l'attribution manuelle du rôle `admin` à l'inscription (*Mass Assignment*).
  - Ajout d'une limite de tentatives de connexion (*Rate Limiting*) contre le brute-force.
  - Message d'erreur unique à la connexion pour éviter l'énumération des utilisateurs.
- **Administration sécurisée** (`back/src/routes/admin.js`) :
  - Vérification obligatoire du rôle `admin` pour lister les utilisateurs (`GET /api/admin/users`).
  - Suppression des hashs de mots de passe dans la réponse de l'API.
- **Fuite d'informations et en-têtes HTTP** (`back/src/index.js`, `front/nginx.conf`, `front/public/robots.txt`) :
  - Suppression de la route `/api/debug` (qui exposait les variables d'environnement) et masquage des *stack traces* d'erreurs.
  - Nettoyage du fichier `robots.txt`.
  - Ajout des en-têtes de sécurité HTTP (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`).

