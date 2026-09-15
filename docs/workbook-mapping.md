# Mapping du classeur de référence 2025

Les quatre exemples ont été comparés par programme, sans exposer de données personnelles. Ils possèdent la même structure : `detail 2025` (215 cellules, 5 zones fusionnées) et `IRPP  2025` (12 060 cellules, 658 zones fusionnées), 4 entrées de dessin et 2 réglages d’imprimante. Les écarts de valeurs ont confirmé que les champs ci-dessous sont variables. Les formules historiques ne sont pas une source juridique et ne sont pas réutilisées.

| Champ | Feuille / cellules | Type | État | Confiance |
|---|---|---|---|---|
| Année | `IRPP  2025!D4` | nombre | calculé | élevée |
| CIN | `IRPP  2025!E8:L8` | texte, un chiffre/cellule | requis | élevée |
| Nom | `IRPP  2025!O19` | texte | requis | élevée |
| Date de naissance | `O21:R21`, `T21:U21`, `W21:X21` | texte, un chiffre/cellule | requis | élevée |
| Adresse / CP / profession | `F22`, `C23:F23`, `J24` | texte | requis | élevée |
| Salaire de base | `detail 2025!B3` | nombre | requis | élevée |
| Chef de famille | `detail 2025!G2` | drapeau | facultatif | élevée |
| Déductions communes | `C255:C267` | nombre | facultatif | élevée pour les libellés, moyenne pour la relation de calcul historique |
| Revenu net / arrondi | `C279`, `C280` | nombre | calculé | élevée |
| Tranches IRPP | `E285:E292` | nombre | calculé | moyenne |
| CSS / IRPP théoriques | `B293`, `E293` | nombre | calculé | élevée |
| Retenues IRPP / CSS | `N357`, `N359` | nombre | requis | élevée |
| Solde | `B362` | nombre | calculé | moyenne |

Les cases d’état civil `Q28` / `U28` apparaissent dans les exemples pour marié / célibataire. Les positions divorcé/veuf ne sont pas déterminées avec une confiance suffisante : l’export ne les renseigne pas. Le modèle est donc intitulé **REFERENCE** et affiche une alerte avant téléchargement.

Le script `scripts/sanitize-template.ps1` nettoie les cellules variables et tous les caches de formules, anonymise les métadonnées du document, et conserve dessins, médias, dimensions, fusions et paramètres d’impression. `scripts/verify-template.ps1` vérifie la structure du package.
