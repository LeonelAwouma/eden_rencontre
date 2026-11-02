# Versions audio des leçons

Chaque leçon de « Bâtir sur le roc » peut avoir une version audio. Quand l'audio **lit le texte de la leçon**,
le mot prononcé est surligné dans le texte pendant l'écoute, l'écran suit la voix, et un clic sur un mot y
déplace la lecture. Quand l'audio est un simple **résumé**, la leçon affiche un lecteur « Résumé audio » sans
surlignage.

## Ce qu'il faut pour le surlignage mot à mot

L'audio doit **dire les mots du texte**, dans l'ordre. Un audio qui résume ou reformule (« Cette leçon explique
que… ») ne peut pas être surligné mot à mot : les mots prononcés ne sont pas ceux de la page.

Convention de lecture (celle de la leçon 1.1) : titre · « Introduction, … » · paragraphes · « Objectif de la
leçon » · « Partie 1 », titre, paragraphes… · cas pratique · « La boussole ». Le quiz et la réflexion ne sont
pas lus. Le texte exact à faire lire est produit par un script :

```bash
npx jiti scripts/lesson-audio-script.ts 1-2            # affiche le texte
npx jiti scripts/lesson-audio-script.ts 1-2 --write    # l'écrit dans docs/audio-scripts/lecon-1-2.txt
```

Les textes de 1.2 et 1.3 sont déjà dans `docs/audio-scripts/`.

## Procédure pour une leçon

1. **Générer l'audio** (ElevenLabs…) à partir du texte du script, avec la même voix que la leçon 1.1.
2. **Déposer le MP3** dans `public/formation/batir-sur-le-roc/audio/` en nommant le fichier comme la leçon
   (`lecon-1-2-le-mariage-comme-sanctuaire.mp3`, sans accents ni espaces). Il remplace le résumé.
3. **Transcrire l'audio** (instant de chaque mot, environ 2 s de calcul par seconde d'audio) :
   ```bash
   py -3.11 scripts/transcribe-lesson-audio.py public/formation/batir-sur-le-roc/audio/lecon-1-2-le-mariage-comme-sanctuaire.mp3
   ```
   Cela écrit `lecon-1-2-le-mariage-comme-sanctuaire.json` à côté du MP3. Prérequis : Python 3.11 avec
   `faster-whisper` (le modèle « medium », ~1,5 Go, est déjà sur le poste de développement).
4. **Brancher le fichier** dans `src/lib/formation/batir-sur-le-roc.ts` : sur la leçon, remplacer `summary: true`
   par la ligne `transcript` (voir la leçon 1.1) :
   ```ts
   audio: { src: `${BASE}/audio/lecon-1-2-le-mariage-comme-sanctuaire.mp3`, transcript: `${BASE}/audio/lecon-1-2-le-mariage-comme-sanctuaire.json` },
   ```

## Bon à savoir

- **Corriger une faute dans le texte ne demande rien de plus** : les mots de la page sont mis en
  correspondance avec la transcription dans le navigateur, au chargement. Il ne faut refaire l'audio et la
  transcription que si le texte change sensiblement (phrases ajoutées, supprimées ou réécrites).
- Un mot en trop ou en moins n'est pas gênant : les mots non retrouvés dans l'audio sont répartis entre leurs
  voisins. Le lecteur se replie sur un simple lecteur si moins de 60 % des mots sont retrouvés.
- Le surlignage n'existe qu'en français : l'audio est en français, il n'est pas proposé dans la version anglaise.
- Les fichiers audio pèsent quelques Mo : ils sont chargés à la demande, jamais avant que le membre ne lance
  la lecture.
