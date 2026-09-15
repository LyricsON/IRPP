# Conversion PDF locale avec Microsoft Excel

Le navigateur crée d’abord le classeur Excel complet à partir de `public/templates/irpp-2025-reference-sanitized.xlsx`. Il n’envoie ensuite ce classeur qu’au service local `127.0.0.1:4318`.

Le service ouvre le fichier en lecture seule dans **Microsoft Excel pour Windows**, avec VBA, événements et mises à jour de liens désactivés. Il sélectionne uniquement les feuilles `IRPP 2025` et `detail 2025`, puis utilise `ExportAsFixedFormat`. Excel applique donc les zones d’impression, dimensions, mises en page, formats et sauts de page du modèle lui-même.

## Démarrage

Dans un second terminal, à la racine du projet :

```powershell
npm.cmd run pdf-helper
```

Conservez ce terminal ouvert, puis utilisez `Télécharger PDF` dans l’application.

Le service écoute exclusivement sur `127.0.0.1:4318`; il ne contacte aucun réseau externe. Chaque requête emploie un répertoire temporaire aléatoire, supprimé dès que la réponse PDF a été envoyée, y compris en cas d’échec.

## Prérequis

Une installation de bureau de Microsoft Excel pour Windows est nécessaire. Excel sur le web ne fournit pas l’automatisation COM et le bouton PDF affichera alors une erreur claire. Le bouton Excel reste utilisable sans ce prérequis.
