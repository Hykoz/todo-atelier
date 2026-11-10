# Rapport de sécurité — [nom de l'application]

Groupe : [noms]
Date : 10 novembre 2026

## Résumé

En deux ou trois phrases : combien de failles trouvées, combien corrigées, le niveau de risque global restant.

## Failles trouvées et corrigées

Une section par faille. Dupliquez ce modèle autant de fois que nécessaire.

### [Titre court de la faille]

- **Famille OWASP** : [ex. A01 — Broken Access Control]
- **Où** : [fichier et ligne, ou route]
- **Reproduction** : [étapes pour déclencher la faille — avant correction]
- **Impact** : [ce que l'attaquant obtenait ; critère D.I.C.P. touché]
- **Gravité** : [critique / élevée / moyenne / faible], avec une courte justification
- **Correctif** : [ce qui a été changé dans le code, avec un extrait avant/après si utile]
- **Statut** : ✅ Corrigé — [comment on l'a vérifié]

## Durcissement complémentaire

- [ ] CORS restreint à l'origine du front
- [ ] En-têtes de sécurité (`helmet`) ajoutés
- [ ] `npm audit fix` exécuté

## Dépendances — risques résiduels

Si une vulnérabilité de dépendance n'a pas pu être corrigée :

| Paquet | Gravité | Pourquoi ce n'est pas corrigé | Impact réel sur cette application |
|---|---|---|---|
| [ex. express] | [high] | [nécessite Express 5, risque de casser l'API] | [application pédagogique, en local, pas de donnée réelle] |

S'il n'y a aucun risque résiduel, écrire : « Aucune vulnérabilité de dépendance restante au moment du rendu. »

## Pipeline de vérification continue

- Lien vers le workflow : `.github/workflows/securite.yml`
- Capture ou lien vers une exécution réussie (onglet **Actions** du repo) : [lien]

## Ce qu'on referait différemment

Deux ou trois phrases : avec plus de temps, qu'auriez-vous corrigé ou vérifié en plus ?
