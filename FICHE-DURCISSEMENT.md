# Fiche de durcissement — séance 3

Trois correctifs complémentaires, dans le même esprit « avant / après » que la séance 2. À faire dans l'ordre, un à la fois, en relançant l'application après chacun.

## 1. CORS grand ouvert

**Où** : `back/src/index.js`

```js
// Avant — autorise n’importe quel site à appeler l’API
app.use(cors());
```

```js
// Après — seule l’adresse du front est autorisée
app.use(cors({
  origin: process.env.FRONT_ORIGIN || 'http://localhost:8080',
}));
```

**Pourquoi** : `cors()` sans option autorise toute origine à appeler l'API depuis un navigateur. Une application malveillante hébergée ailleurs pourrait alors utiliser le jeton d'un utilisateur piégé pour appeler l'API en son nom.

## 2. En-têtes de sécurité absents

**Où** : `back/src/index.js`

```
npm install helmet
```

```js
// Avant — aucun en-tête de sécurité
const app = express();
app.use(cors());
```

```js
// Après
const helmet = require('helmet');
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONT_ORIGIN || 'http://localhost:8080' }));
```

**Pourquoi** : `helmet` ajoute plusieurs en-têtes HTTP de sécurité par défaut (contre le détournement de type MIME, le chargement de la page dans un cadre invisible, etc.). Ce n'est pas un correctif ciblé sur une faille précise de l'application, mais une protection de base que tout projet devrait avoir.

## 3. Dépendances qui ne se corrigent pas toutes seules

```
cd back
npm audit fix
npm audit
```

Certaines vulnérabilités signalées par `npm audit` ne disparaissent pas avec `npm audit fix` seul : elles exigent une montée de version majeure (par exemple une nouvelle version d'Express), qui peut casser le reste du code.

**Deux choix possibles, à documenter dans le rapport :**

- **Corriger quand même**, si le temps le permet : `npm audit fix --force`, puis retester entièrement l'application (connexion, tâches, administration). Si quelque chose casse, on revient en arrière (`git checkout -- back/package*.json` puis `npm install`).
- **Accepter le risque résiduel**, si la montée de version est trop risquée pour le temps restant : dans ce cas, le README doit dire explicitement quelle vulnérabilité reste, pourquoi elle n'a pas été corrigée, et quel impact réel elle aurait sur cette application (pas sur une application en production avec de vrais utilisateurs).

Un risque documenté et justifié est préférable à un `--force` qui casse l'application sans qu'on s'en rende compte.
