# Géolocalisation — impact sur le matching (Lot 1)

## Règle
La géographie ne modifie **pas** le moteur : aucun bonus de distance ou de proximité n'a été ajouté. Le
moteur ne lit jamais `member_locations` et ne reçoit aucune coordonnée ni identifiant de zone.

## Le seul point de contact : `profiles.city` dans `scoring.ts`
`scorePreferences` compare `city` / `country` de `profiles` (sous-critère « distance » de la catégorie
Préférences, poids 0,20 dans une catégorie à 5 %) : même ville = 100, même pays = 70, sinon 40.

Depuis ce lot, `profiles.city` d'un nouveau membre ne contient la vraie ville que si son niveau
d'affichage est « ville ». Sinon il contient l'étiquette générique « Non précisée ».
- Une étiquette générique n'est **jamais** une ville : deux membres « Non précisée » ne reçoivent pas
  « même ville » (`isSameRealCity`, `src/lib/geo/public-label.ts`).
- On retombe alors sur le critère de pays déjà existant (70 / 40).
- Les profils historiques (ville non générique, non modifiée) conservent exactement leurs scores et classements
  (test : `scoring-city-signal.test.ts`, comparaison à l'ancienne formule sur un jeu d'échantillons, y compris
  valeurs vides).

## Changement de score documenté (retrait volontaire de la ville)
Un membre qui masque sa ville passe, pour une paire à même ville, de 100 à 70 sur ce sous-critère
(−30 points × 0,20 × poids de catégorie 0,05 ≈ −0,3 point sur 100 au score global). C'est la conséquence
directe du choix de confidentialité, pas un nouveau critère géographique. Si l'on souhaite conserver le
signal « même ville » malgré le masquage, il faudra le calculer côté serveur (booléen), sans jamais exposer
la ville au navigateur : non implémenté, l'impact étant jugé négligeable.
