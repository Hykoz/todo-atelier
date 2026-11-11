# Rapport de sécurité — Mes tâches (`todo-atelier`)

Groupe : Baptiste MASSON
Date : 11 novembre 2026

## Résumé

Lors de l'audit de l'application **Mes tâches**, nous avons identifié **8 failles applicatives** (injections SQL et XSS, défauts de contrôle d'accès IDOR/admin, élévation de privilèges, hachage MD5, secret JWT faible et fuite d'informations) ainsi que **5 vulnérabilités de dépendances npm**. L'intégralité des failles applicatives et des dépendances vulnérables a été corrigée et vérifiée par tests manuels et analyse automatisée (`npm audit` et `Semgrep`). Le niveau de risque global restant est désormais **faible**.

## Failles trouvées et corrigées

### 1. Injection SQL dans la recherche de tâches

- **Famille OWASP** : A03:2021 — Injection
- **Où** : `back/src/routes/todos.js` (route `GET /api/todos`, lignes 10–23)
- **Reproduction** : Se connecter avec un compte standard (`alice`), saisir `%' OR 1=1 --` ou `%' UNION SELECT id, 1, username, password, false, NOW() FROM users --` dans le champ « Rechercher une tâche » et valider.
- **Impact** : Lecture de toutes les tâches des autres utilisateurs (dont la clé d'API de production de l'admin) et exfiltration de la table `users` (noms d'utilisateurs et hashs de mots de passe). Critères touchés : **Confidentialité** (et **Intégrité / Disponibilité** si requêtes destructrices).
- **Gravité** : **Critique** — Permet d'extraire toute la base de données sans privilège particulier.
- **Correctif** : Remplacement de la concaténation de chaînes SQL par une requête préparée paramétrée (`$1`, `$2`) et suppression du renvoi de la requête SQL brute dans les erreurs.
  ```js
  // Avant
  let sql = `SELECT * FROM todos WHERE user_id = ${req.user.id}`;
  if (search) {
    sql += ` AND title ILIKE '%${search}%'`;
  }
  const result = await pool.query(sql);

  // Après
  const params = [req.user.id];
  let sql = 'SELECT * FROM todos WHERE user_id = $1';
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND title ILIKE $${params.length}`;
  }
  const result = await pool.query(sql, params);
  ```
- **Statut** : ✅ Corrigé — Vérifié en recherchant `%' OR 1=1 --` (aucune tâche tierce renvoyée) et via la règle Semgrep `sql-string-concatenation`.

---

### 2. Faille XSS (Cross-Site Scripting) dans la recherche et la liste des tâches

- **Famille OWASP** : A03:2021 — Injection (XSS)
- **Où** : `front/public/app.js` (fonctions `showSearchInfo`, `renderTodos` et affichage de la table admin)
- **Reproduction** : Saisir une balise HTML/JS comme `<img src=x onerror="alert(localStorage.getItem('token'))">` dans la barre de recherche ou dans le titre/description d'une nouvelle tâche.
- **Impact** : Exécution de code JavaScript arbitraire dans le navigateur de la victime, permettant notamment de voler son jeton JWT stocké dans `localStorage`. Critères touchés : **Confidentialité** et **Intégrité**.
- **Gravité** : **Élevée** — La variante stockée dans les tâches affecte toute session affichant la tâche et permet le vol de session.
- **Correctif** : Remplacement de toutes les affectations `.innerHTML` par la création sécurisée de nœuds DOM (`document.createElement`) et l'utilisation de `.textContent`, complété par un en-tête `Content-Security-Policy`.
  ```js
  // Avant
  $('search-info').innerHTML = search ? 'Résultats pour : <strong>' + search + '</strong>' : '';

  // Après
  const container = $('search-info');
  container.textContent = '';
  if (search) {
    container.append('Résultats pour : ');
    const strong = document.createElement('strong');
    strong.textContent = search;
    container.appendChild(strong);
  }
  ```
- **Statut** : ✅ Corrigé — Vérifié en saisissant `<img src=x onerror=alert(1)>` : le code s'affiche désormais comme du texte brut sans s'exécuter.

---

### 3. Accès non restreint à la liste des utilisateurs et fuite des hashs (Broken Access Control)

- **Famille OWASP** : A01:2021 — Broken Access Control
- **Où** : `back/src/routes/admin.js` (route `GET /api/admin/users`, lignes 9–18)
- **Reproduction** : Appeler `GET /api/admin/users` avec le jeton JWT d'un simple utilisateur (`alice`).
- **Impact** : N'importe quel utilisateur connecté récupère la liste complète des comptes ainsi que la colonne `password` (hashs de mots de passe). Critère touché : **Confidentialité**.
- **Gravité** : **Critique** — Contournement complet de la restriction d'administration et exposition des empreintes de mots de passe de tous les comptes.
- **Correctif** : Ajout d'un middleware `requireAdmin` vérifiant `req.user.role === 'admin'` sur l'ensemble du routeur admin et retrait de la colonne `password` du `SELECT`.
  ```js
  // Avant
  router.get('/users', async (req, res, next) => {
    const result = await pool.query(
      'SELECT id, username, email, role, password, created_at FROM users ORDER BY id'
    );
    res.json(result.rows);
  });

  // Après
  router.use(requireAdmin);
  router.get('/users', async (req, res, next) => {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY id'
    );
    res.json(result.rows);
  });
  ```
- **Statut** : ✅ Corrigé — Vérifié avec un jeton `user` : l'API renvoie désormais `403 Accès réservé aux administrateurs`.

---

### 4. IDOR sur la lecture, modification et suppression des tâches

- **Famille OWASP** : A01:2021 — Broken Access Control
- **Où** : `back/src/routes/todos.js` (routes `GET /api/todos/:id`, `PUT /api/todos/:id`, `DELETE /api/todos/:id`)
- **Reproduction** : Connecté en tant qu'`alice` (`user_id = 2`), envoyer une requête `GET`, `PUT` ou `DELETE` sur `/api/todos/1` (tâche appartenant à `admin`).
- **Impact** : Lecture, modification ou suppression des tâches appartenant aux autres utilisateurs en devinant simplement leur identifiant numérique (`id`). Critères touchés : **Confidentialité**, **Intégrité**, **Disponibilité**.
- **Gravité** : **Élevée** — Les identifiants séquentiels rendent l'énumération et l'altération des tâches triviales.
- **Correctif** : Ajout systématique de la condition `AND user_id = $2` (ou `$5`) avec `req.user.id` dans les requêtes SQL `SELECT`, `UPDATE` et `DELETE`.
  ```js
  // Avant
  await pool.query('DELETE FROM todos WHERE id = $1 RETURNING id', [req.params.id]);

  // Après
  await pool.query(
    'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  ```
- **Statut** : ✅ Corrigé — Vérifié en tentant de modifier/supprimer la tâche `id = 1` depuis le compte d'`alice` (renvoie `404 Tâche introuvable`).

---

### 5. Élévation de privilèges à l'inscription (Mass Assignment)

- **Famille OWASP** : A01:2021 — Broken Access Control / A04:2021 — Insecure Design
- **Où** : `back/src/routes/auth.js` (route `POST /api/register`, ligne 19)
- **Reproduction** : Envoyer une requête `POST /api/register` avec le corps JSON `{"username": "hacker", "password": "password123", "role": "admin"}`.
- **Impact** : Création directe d'un compte disposant des droits `admin`. Critères touchés : **Confidentialité**, **Intégrité**, **Preuve**.
- **Gravité** : **Critique** — Permet à tout visiteur d'obtenir les privilèges administrateur dès l'inscription.
- **Correctif** : Ignorer `req.body.role` et forcer la valeur `'user'` lors de l'insertion en base, avec ajout d'un `rateLimiter` et d'un message d'erreur unifié sur `/login`.
  ```js
  // Avant
  const role = req.body.role || 'user';

  // Après
  // Le rôle est forcé à 'user' côté serveur
  'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
  [username.trim(), hashPassword(password), email ? String(email).trim() : null, 'user']
  ```
- **Statut** : ✅ Corrigé — Vérifié en envoyant `"role": "admin"` à `/api/register` : le compte créé a bien le rôle `"user"`.

---

### 6. Hachage faible des mots de passe (MD5 sans sel)

- **Famille OWASP** : A02:2021 — Cryptographic Failures
- **Où** : `back/src/auth.js` (fonction `hashPassword`, ligne 7) et `db/init.sql`
- **Reproduction** : Récupérer un hash de la base (ex. `0192023a7bbd73250516f069df18b500`) et le comparer via une table précalculée (CrackStation) ou par dictionnaire.
- **Impact** : Retrouver les mots de passe en clair quasi instantanément (`admin123`, `password1`, `qwerty`). Critère touché : **Confidentialité**.
- **Gravité** : **Élevée** — MD5 est un algorithme rapide et sans sel, inadapté au stockage de mots de passe.
- **Correctif** : Remplacement de MD5 par `crypto.scryptSync` avec un sel aléatoire par mot de passe et vérification en temps constant via `crypto.timingSafeEqual`.
  ```js
  // Avant
  function hashPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  // Après
  function hashPassword(password) {
    const salt = crypto.randomBytes(8).toString('hex');
    const hash = crypto.scryptSync(password, salt, 23).toString('hex');
    return `${salt}:${hash}`;
  }
  ```
- **Statut** : ✅ Corrigé — Vérifié par l'absence d'alerte Semgrep (`weak-hash-md5` / `md5-used-as-password`) et test de connexion.

---

### 7. Secret JWT faible par défaut et absence d'expiration

- **Famille OWASP** : A02:2021 — Cryptographic Failures / A07:2021 — Identification and Authentication Failures
- **Où** : `back/src/auth.js` (lignes 4, 11, 18) et `docker-compose.yml`
- **Reproduction** : Lire `JWT_SECRET` (qui vaut `'secret'`) et forger un jeton JWT avec `{"id": 1, "username": "admin", "role": "admin"}` signé avec `'secret'`.
- **Impact** : Usurpation de n'importe quel compte (dont `admin`) avec des jetons valides indéfiniment. Critères touchés : **Confidentialité**, **Intégrité**, **Preuve**.
- **Gravité** : **Critique** — Permet de forger des jetons d'authentification valides sans connaître le mot de passe.
- **Correctif** : Remplacement du repli `'secret'` par `crypto.randomBytes(32).toString('hex')`, définition d'un secret fort dans `docker-compose.yml`, ajout de `expiresIn: '2h'` et restriction explicite `{ algorithms: ['HS256'] }`.
- **Statut** : ✅ Corrigé — Vérifié avec Semgrep (`hardcoded-jwt-secret` ne remonte plus d'alerte).

---

### 8. Route `/api/debug` exposant `process.env` et fuite des traces d'erreurs (`stack`)

- **Famille OWASP** : A05:2021 — Security Misconfiguration
- **Où** : `back/src/index.js` (lignes 23–29 et 35–37) et `front/public/robots.txt`
- **Reproduction** : Consulter `robots.txt` qui révèle `/api/debug`, puis ouvrir `http://localhost:8080/api/debug` dans un navigateur.
- **Impact** : Exposition de toutes les variables d'environnement du serveur (`DB_PASSWORD`, `JWT_SECRET`) et des chemins internes via `err.stack`. Critère touché : **Confidentialité**.
- **Gravité** : **Critique** — Donne un accès direct aux secrets de la base de données et de signature JWT sans authentification.
- **Correctif** : Suppression complète de la route `/api/debug`, nettoyage de `/api/health` et `robots.txt`, et remplacement de `err.stack` par un message générique côté client (`Erreur interne du serveur`).
- **Statut** : ✅ Corrigé — Vérifié en appelant `/api/debug` (`404`) et via les règles Semgrep `debug-route-exposes-env` et `error-handler-leaks-stack`.

---

## Durcissement complémentaire

- [x] CORS restreint à l'origine du front
- [x] En-têtes de sécurité (`helmet`) ajoutés
- [x] `npm audit fix` exécuté (et ajout de `USER node` dans `back/Dockerfile`)

## Dépendances — risques résiduels

Aucune vulnérabilité de dépendance restante au moment du rendu (`npm audit` retourne `found 0 vulnerabilities` après mise à jour vers `express@^4.22.3` et `jsonwebtoken@^9.0.3`).

## Pipeline de vérification continue

- Lien vers le workflow : [`.github/workflows/securite.yml`](file:///Users/baptiste.masson/Desktop/todo-atelier/.github/workflows/securite.yml)
- Lien vers une exécution réussie (onglet **Actions** du repo) : https://github.com/Hykoz/todo-atelier/actions

## Ce qu'on referait différemment

Avec plus de temps, nous aurions stocké le jeton JWT dans un cookie `HttpOnly; SameSite=Strict; Secure` plutôt que dans `localStorage` afin d'éliminer tout risque d'exfiltration du jeton par script client. Nous aurions également remplacé le limiteur de tentatives en mémoire (`Map`) par un stockage partagé type Redis et ajouté des tests d'intégration automatisés dans la CI pour vérifier systématiquement les contrôles d'accès (401/403) sur chaque route.

