rd-nb
===============

## Présentation ##

Le module **rd-nb** détermine *(méthode bayésienne naïve)* la catégorie d'un `article` **(doit être positionné après : `li-2mods` ou ``oi-select``)**.

### Fonctionnement ###

`rd-nb` effectue ses traitements dans une fonction `doTheJob()` dédiée.

Le module effectue les opérations suivantes :
  - Récupération en entrée d'un `docObject` (objet JSON avec un champ `idIstex`), ainsi que d'une callback `cb`.
  - Récupération de l'abstract (à partir de son fichier mods) puis catégorisation de l'article.
  - Création du fragment de TEI (si au moins une catégorie lui a été affectée).
  - Renvoi des éventuelles erreurs en paramètre de la callback `cb`.

## Utilisation ##

### Ressources ###

#### Path, config et template ####

*Par défaut, toutes les ressources du module se trouvent dans le répertoire `resources/`*

Pour que le module fonctionne correctement, il lui faut :
  - Le chemin **relatif** de **chaque ressources** (fichiers/répertoires). *Obligatoirement dans le fichier `paths.json`*
  - Les paramètres du module (le nom, la version, la langue...). *Par défaut dans le fichier `config.default.json`*
  - Un fichier de template qui permet de générer le TEI. *Par défaut dans le fichier `fragment.tei.xml.tpl`*

##### Template #####

La variable *data* du fichier `index.js` contient toutes les données accessibles dans le template, soit :

```js
// Construction de la structure de données pour le template
var data = {
  'date': business.NOW,
  'module': business.resources.config, // Infos sur la configuration du module
  'document': { // Infos sur le document
    'id': documentId,
    'categories': categories
  }
}
```

Concrétement, les données seront sous la forme :

```json
{
  "date": "11-01-2017",
  "module": {
    "id": "rd-nb",
    "version": "1.0.1",
    "label": "nb",
    "lang": "en",
    "training": "pascal-francis",
    "scheme": "http://inist-category.lod.istex.fr",
    "probability": {
      "min": 0.05
    },
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    }
  },
  "document": {
    "id": "0000000000000000000000000000000000000000",
    "categories": [{
      "code": "STM",
      "probability": 0.651637563297372,
      "verbalization": "SCIENCES APPLIQUEES, TECHNOLOGIES ET MEDECINES",
      "level": 1
    }, {
      "code": "001",
      "probability": 0.5541006144477459,
      "verbalization": "SCIENCES EXACTES ET TECHNOLOGIE",
      "level": 2
    }, {
      "code": "001E",
      "probability": 0.20272618300842637,
      "verbalization": "TERRE, OCEAN, ESPACE",
      "level": 3
    }, {
      "code": "001E02",
      "probability": 0.31605416143215126,
      "verbalization": "GEOPHYSIQUE EXTERNE",
      "level": 4
    }]
  }
}
```

Exemple :

  - Pour insérer la date dans le template (`resources/fragment.tei.xml.tpl`), il faudra ajouter `{{date}}`.
  - Pour insérer l'`id` du document, il faudra ajouter `{{document.id}} `.

**Attention :** *Les valeurs des variables entre double accolades sont 'sanitizées'. Si l'on souhaite ajouter une valeur brute (exemple : url, symboles), il faut utiliser une triple accolades `{{{ maVariable }}}`.*

Pour plus d'infos, voir la [documentation](https://github.com/raycmorgan/Mu) de mustache pour nodejs

#### Trainings ####

Pour des raisons de performance, les données d'apprentissages sont préalablement générées et stockées dans le répertoire des `trainings` (par défaut : `/resources/trainings/`).

##### Arborescence des fichiers #####

```
.
[...]
├── resources
│   ├── trainings           // Répertoire contenant les entrainements
│   │   ├── SHS-STM.json
│   │   ├── 001-002.json
│   │   └── 001.json
│   └── mapping.json        // Mapping des entrainements
[...]
```

##### Fichier d'entraînement #####

Pour générer un fichier d'entrainement, on peut utiliser :
  - le script basique `train.js` (qui utilise le Bayésien Naïf).
  - le Bayésien Naïf (`lib/nb.js`).

###### train.js ######

```bash
node train.js --input=my/path/train.txt --output=resources/trainings/train.json --separator=";"
```

Paramètres :
  - `input` Chemin du fichier contenant les textes. Chaque lignes doivent être sous la forme : *label* `separator` *texte* (exemple : label1;mon texte à classer)
  - `output` Chemin du fichier de sortie du fichier d'entrainement (au format json)
  - `separator` Séparateur entre le label et le texte. Par défaut, c'est une tabulation. (exemple : --separator=";") *paramètre optionnel*

###### nb.js ######

Les principales fonctions disponibles sont :
  - `nb.train(label, text)` : Ajoute un texte à l'entrainement.
  - `nb.save(path, callback)` : Sauvegarde l'entrainement en cours.
  - `nb.load(path)` : Charge un entrainement.
  - `nb.guess(text)` : Détermine la/les classes la/les plus probable(s).

#### Mapping ####

Le fichier de mapping (par défaut : `resources/mapping.json`) indique au module quelles données d'entrainement utiliser pour effectuer la classification. La clé `entry` à celles utilisées en premier. Le résultat de chaque classification définit les prochaines données d'entrainement. La classification dès qu'il n'a plus de données d'entrainement disponible.

##### Structure #####

La strucuture de l'objet représentant le mapping est la suivante :
  - Chaque *clé* représente un des résultats possible de classification (à l'exception de `entry`).
  - Chaque *valeur* représente **le chemin relatif** du fichier d'entrainement à utiliser (dans ce fichier la *"racine"* du *chemin* sera donc le répertoire des `trainings`).

### Exemple de mapping & trainings ###

#### Mapping ####

`mapping.json`

```json
{
  "entry": "SHS-STM.json",
  "STM": "001-002.json",
  "001": "001.json"
}
```

#### Trainings ####

`trainings/`

```
.
[...]
├── trainings
    ├── SHS-STM.json
    ├── 001-002.json
    └── 001.json
[...]
```

#### Différents résultats possibles ####

Voici les différents résultats possibles pour chaque fichier d'entraînement :

```
SHS-STM.json
  ├── SHS
  └── STM

001-002.json
  ├── 001
  └── 002

001.json
  ├── 001A
  ├── 001B
  ├── 001C
  └── ...
```

Et donc tous les cas possibles :

```
entry ┬──> SHS
      └──> STM ┬──> 001 ┬──> 001A
               │        ├──> 001B
               │        ├──> 001C
               │        └──> ...
               └──> 002
```

#### Explications détaillées ####

1. *Point d'entrée `entry`* (1ère classification), il y a 3 résultats possibles :
  - `STM` --> Le fichier d'entrainement suivant sera **001-002.json**.
  - `SHS` --> *Aucun fichier d'entrainement renseignée, la classification se termine.*
  - *Aucune catégorie n'a pu être affectée (pour cette étape), la classification se termine.*

2. *Le précédent résultat était `STM`* (2ème classification), il y a 3 résultats possibles :
  - `001` --> Le fichier d'entrainement suivant sera **001.json**.
  - `002` --> *Aucun fichier d'entrainement renseignée, la classification se termine.*
  - *Aucune catégorie n'a pu être affectée (pour cette étape), la classification se termine.*

3. *Le précédent résultat était `001`* (3ème classification), il y a *X* résultats possibles :
  - `001A` --> *Aucun fichier d'entrainement renseignée, la classification se termine.*
  - `001B` --> *Aucun fichier d'entrainement renseignée, la classification se termine.*
  - `001C` --> *Aucun fichier d'entrainement renseignée, la classification se termine.*
  - ...
  - *Aucune catégorie n'a pu être affectée (pour cette étape), la classification se termine.*

## Annexes ##

### Arborescence ###

```
.
├── changelog.md                    // changelog
├── index.js                        // point d'entrée, contenant la fonction doTheJob()
├── lib                             // répertoire des librairies
│   └── nb.js                           // fichier de classe du bayésien naïf
├── newVersion                      // script de version
├── node_modules                    // modules NPM
│   └── ...
├── package.json                    // packages
├── README.md                       // readme
├── resources                       // répertoire des ressources
│   ├── config.default.json             // configuration du module
│   ├── fragment.tei.xml.tpl            // template du fragment de TEI
│   ├── mapping.json                    // mapping des entraînements
│   ├── paths.json                      // chemins utiles au module
│   ├── trainings                       // répertoire des entraînements
│   │   └── ...
│   └── verbalization.json              // verbalisations des codes de classements
├── test                            // répertoire des TU
│   ├── dataset                         // répertoire des données de test
│   │   └── ...
│   └── run.js                          // point d'entrée des TU
└── train.js                        // script d'entraînement
```

### Codes d'erreur ###

Plage de codes : 0~99

Code | Signification           | Note(s)
-----|-------------------------|--------
1    | Erreur lecture/écriture |