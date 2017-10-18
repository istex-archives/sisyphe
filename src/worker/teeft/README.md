rd-teeft
===============

## Présentation ##

Le module **rd-teeft** indexe le fulltext d'un `article` **(doit être positionné après : `li-2mods` ou ``oi-select``)**.

### Fonctionnement ###

`rd-teeft` effectue ses traitements dans une fonction `doTheJob()` dédiée.

Le module effectue les opérations suivantes :
  - Récupération en entrée d'un `docObject` (objet JSON avec un champ `idIstex`), ainsi que d'une callback `cb`.
  - Récupération du fulltext de l'article puis indexation.
  - Création du fragment de TEI contenant les termes indexés.
  - Renvoi des éventuelles erreurs en paramètre de la callback `cb`.

## Utilisation ##

### Ressources ###

#### Path, config et template ####

*Par défaut, toutes les ressources du module se trouvent dans le répertoire `resources/`*

Pour que le module fonctionne correctement, il lui faut :
  - Le chemin **relatif** de **chaque ressources** (fichiers/répertoires). *Obligatoirement dans le fichier `paths.json`*
  - Les paramètres du module (le nom, la version, la langue...). *Par défaut dans le fichier `config.default.json`*
  - Un fichier de template qui permet de générer le TEI. *Par défaut dans le fichier `fragment.tei.xml.tpl`*

#### Template ####

La variable *data* du fichier `index.js` contient toutes les données accessibles dans le template, soit :

```js
// Construction de la structure de données pour le templates
var data = {
  'date': business.NOW,
  'module': business.resources.config, // Infos sur la configuration du module
  'document': { // Infos sur le document
    'id': documentId,
    'terms': text.keywords // Termes indexés
  }
}
```

Concrétement, les données seront sous la forme :

```json
{
  "date": "11-01-2017",
  "module": {
    "id": "rd-teeft",
    "version": "1.0.1",
    "label": "teeft",
    "lang": "en",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    },
    "resource": "brown",
    "truncate": true,
    "sort": true
  },
  "document": {
    "id": "0000000000000000000000000000000000000000",
    "terms": [{
      "frequency": 6,
      "strength": 2,
      "specificity": 1,
      "term": "feature selection"
    }, {
      "frequency": 11,
      "strength": 1,
      "specificity": 0.865187981752399,
      "term": "algorithm"
    }, {
      "frequency": 4,
      "strength": 2,
      "specificity": 0.6666666666666666,
      "term": "classification results"
    }, {
      "frequency": 3,
      "strength": 2,
      "specificity": 0.5,
      "term": "text classification"
    }, {
      "frequency": 3,
      "strength": 2,
      "specificity": 0.5,
      "term": "confusion matrix"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "average representation"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "information gain"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "high degree"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "bayes classifier"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "classification methods"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "original data"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "filter approach"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "french verbs"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "feature maximization"
    }, {
      "frequency": 2,
      "strength": 2,
      "specificity": 0.3333333333333333,
      "term": "optimal results"
    }]
  }
}
```

Exemple :

  - Pour insérer la date dans le template (`resources/fragment.tei.xml.tpl`), il faudra ajouter `{{date}}`.
  - Pour insérer l'`id` du document, il faudra ajouter `{{document.id}} `.

**Attention :** *Les valeurs des variables entre double accolades sont 'sanitizées'. Si l'on souhaite ajouter une valeur brute (exemple : url, symboles), il faut utiliser une triple accolades `{{{ maVariable }}}`.*

Pour plus d'infos, voir la [documentation](https://github.com/raycmorgan/Mu) de mustache pour nodejs

#### stopwords.json ####

Ce fichier (par default : `resources/stopwords.json`) permet de lister les termes à filtrer lors de l'indexation. C'est le dictionnaire de mots vide du module.
C'est un objet json dont chaque clé représente un mot. La valeur n'est pas prise en compte, par défaut elle est mise à false.

```json
{
  "essay": false,
  "second": false,
  "all": false
}
```

**Seul le *`stem`* des mots vides est à renseigner dans ce fichier. Lors de l'étape de `Sanitization`, chaque terme du texte est *"stemmé"* avant d'être comparé à cette liste.**

#### dictionary.json ####

Ce fichier (par default : `resources/dictionary.json`) permet de pondérer la spécificité d'un terme.
C'est un objet json dont chaque clé représente un mot qui à pour valeur un coefficient de pondération.

```json
{
  "government": 0.00911017,
  "city": 0.00872881,
  "president": 0.00868644,
  "business": 0.00830508,
  "several": 0.00798729,
  "national": 0.00794492,
}
```

### Indexation ###

L'indexation s'effectue en 5 grandes étapes :

  - `Tokenization` : découpage du texte en `tokens`.
  - `Tag` : Tag de chaque `tokens`.
  - `Lemmatization` : Lemmatisation de tous les `tokens` taggés.
  - `Sanitization` : "Nettoyage" des termes (retrait des mots vides, mal formés, etc).
  - `Extraction` : Extraction des termes (en fonction des filtres configurés).

#### Tokenization ####

Le texte est découpé afin d'extraire des `tokens`. Les séparateurs utilisés sont les espaces blancs et la ponctuation.

#### Tag ####

Chaque `tokens` est taggé (par défaut, comme un nom).

#### Lemmatization ####

Chaque `tokens` taggés est lemmatizé.

#### Sanitization ####

À cette étape, seul les `tokens` correspondant aux critères sont conservés, à savoir :

  - ceux qui ne sont pas des mots vide.
  - ceux taggés comme des noms ou adjectifs.
  - ceux ayant une taille supérieur ou égale à la taille minimum.
  - ceux ayant un nombre de chiffres et caractères spéciaux inférieur à la limite maximale.

Tous les autres sont considérés consiérés comme n'étant pas *"indexable"*.

#### Extraction ####

Une fois le nettoyage effectué, l'extrateur va regrouper les multi-termes entre eux puis effectuer des statistiques (calcul de fréquence, spécificité, etc).
Par défaut, seul les *termes* dont la spécificité est **supérieure** à la *Moyenne des spécificités* sont sélectionnés.

## Annexes ##

### Arborescence ###

```
.
├── changelog.md                    // changelog
├── index.js                        // point d'entrée, contenant la fonction doTheJob()
├── lib                             // répertoire des librairies
│   ├── defaultfilter.js                // fichier de classe des filtres
│   ├── lexicon.js                      // fichier de classe du lexique du tagger
│   ├── tagger.js                       // fichier de classe du tagger
│   └── termextractor.js                // fichier de classe de l'extracteur de terme
├── newVersion                      // script de version
├── node_modules                    // modules NPM
│   └── ...
├── package.json                    // packages
├── README.md                       // readme
├── resources                       // répertoire des ressources
│   ├── config.default.json             // configuration du module
│   ├── dictionary.json                 // dictionnaire de mot (pour la pondération de terme)
│   ├── fragment.tei.xml.tpl            // template du fragment de TEI
│   ├── paths.json                      // chemins utiles au module
│   └── stopwords.json                  // liste des mots vides
└── test                            // répertoire des TU
    ├── dataset                         // répertoire des données de test
    │   └── ...
    └── run.js                          // point d'entrée des TU
```

### Codes d'erreur ###

Plage de codes : 0~99

Code | Signification           | Note(s)
-----|-------------------------|--------
1    | Erreur lecture/écriture |