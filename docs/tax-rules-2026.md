# Règles IRPP 2026

Le moteur `calculateTax2026` est indépendant de Vue et utilise exclusivement `decimal.js`.

| Règle | Implémentation | Base documentée |
|---|---|---|
| Frais professionnels | 10 % du revenu salarial déclaré, plafonné à 2 000 DT | Code IRPP/IS, art. 26 |
| Chef de famille | 300 DT après détermination explicite de l’éligibilité | Code IRPP/IS, art. 40 et 5 |
| Enfant | 100 DT ; étudiant 1 000 DT ; handicapé 2 000 DT, selon la priorité handicapé > étudiant > normal | Code IRPP/IS, art. 40 |
| Parent à charge | 5 % de la base pertinente, plafonné à 450 DT par parent et pondéré par la part supportée | Code IRPP/IS, art. 40 ; conditions demandées à l’utilisateur |
| Prêt universitaire | Montant réellement payé | Code IRPP/IS, art. 39 |
| Prêt logement | intérêts/commissions seulement si coût HT ≤ 200 000 DT et pas d’autre résidence déclarée | Code IRPP/IS, art. 39 |
| Arrondi | plafond du revenu imposable au dinar entier avant le barème | Code IRPP/IS, art. 44 |
| IRPP | barème 0 / 15 / 25 / 30 / 33 / 36 / 38 / 40 % fourni dans le cahier des charges | Code IRPP/IS, art. 44 |
| CSS | 0,5 % de la base salaire nette des frais et charges de famille, exonération sous/à 5 000 DT | LF 2026 / Note commune n°01 2026 — base explicitement affichée dans le code |

Les contrats d’assurance-vie/capitalisation restent **désactivés** : le projet ne prétend pas appliquer le garde-fou du minimum d’impôt (45 %) sans texte officiel complet et vérifiable dans les sources fournies. C’est une fermeture sûre, non une omission silencieuse. Les revenus hors salaires bloquent également le calcul et l’export.

Les sources sont enregistrées dans `TAX_RULES_2026.metadata`. La recherche publique du Ministère confirme le Code IRPP/IS comme cadre réglementaire, mais le texte officiel 2026 et la Note commune CSS intégrale n’étaient pas disponibles dans le workspace : une revue fiscale avant dépôt reste indispensable.
