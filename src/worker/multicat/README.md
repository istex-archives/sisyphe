rd-multicat
===============

## Présentation ##

Le module **rd-multicat** affecte à un `article` les différentes catégories liées à l'ISSN de son `journal` **(doit être positionné après : `li-2mods` ou ``oi-select``)**.

### Fonctionnement ###

`rd-multicat` effectue ses traitements dans une fonction `doTheJob()` dédiée.

Le module effectue les opérations suivantes :
  - Récupération en entrée d'un `docObject` (objet JSON avec un champ `idIstex`), ainsi que d'une callback `cb`.
  - Récupération de l'ISSN de l'article (à partir de son fichier mods) puis affectation des catégories qui y sont associées.
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
  },
  categorizations: business.resources.categorizations // Infos sur les catégorisations utilisées
}
```

Concrétement, les données seront sous la forme :

```json
{
  "date": "11-01-2017",
  "module": {
    "id": "rd-multicat",
    "version": "1.0.1",
    "label": "multicat",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    },
    "resources": "sm-wos"
  },
  "document": {
    "id": "0000000000000000000000000000000000000000",
    "categories": [{
      "id": "wos",
      "values": [
        [{
          "level": 1,
          "value": "SOCIAL SCIENCE"
        }, {
          "level": 2,
          "value": "TRANSPORTATION"
        }],
        [{
          "level": 1,
          "value": "SCIENCE"
        }, {
          "level": 2,
          "value": "TRANSPORTATION SCIENCE & TECHNOLOGY"
        }, {
          "level": 2,
          "value": "ENGINEERING, CIVIL"
        }]
      ]
    }, {
      "id": "science-metrix",
      "values": [
        [{
          "level": 1,
          "value": "ECONOMIC & SOCIAL SCIENCES"
        }, {
          "level": 2,
          "value": "ECONOMICS & BUSINESS "
        }, {
          "level": 3,
          "value": "LOGISTICS & TRANSPORTATION"
        }]
      ]
    }]
  },
  "categorizations": [{
    "scheme": "http://wos-category.lod.istex.fr",
    "id": "wos",
    "table": "wos.json",
    "label": "Web of Science (WoS) service d’information universitaire en ligne de la société ISI – Institute for Scientific Information de Thomson Scientific."
  }, {
    "scheme": "http://sm-category.lod.istex.fr",
    "id": "science-metrix",
    "table": "science-metrix.json",
    "label": "Science-Metrix, entreprise indépendante basée aux Etats-Unis et au Canada spécialisée en évaluation des activités liées à la science et à la technologie."
  }]
}
```

Exemple :

  - Pour insérer la date dans le template, il faudra ajouter `{{date}}`.
  - Pour insérer l'`id` du document, il faudra ajouter `{{document.id}} `.

**Attention :** *Les valeurs des variables entre double accolades sont 'sanitizées'. Si l'on souhaite ajouter une valeur brute (exemple : url, symboles), il faut utiliser une triple accolades `{{{ maVariable }}}`.*

Pour plus d'infos, voir la [documentation](https://github.com/raycmorgan/Mu) de mustache pour nodejs

#### Tables de correspondances ####

##### Catégorisations #####

Toutes les `tables` de correspondances que le module doit utiliser seront stockées dans un répertoire (par défaut : `/resources/tables`). Un fichier doit lister les tables à utiliser (par défaut : `/resources/categorizations.json`) :

```json
[{
  "scheme": "http://wos-category.lod.istex.fr",
  "id": "wos",
  "table": "wos.json",
  "label": "Web of Science (WoS) service d’information universitaire en ligne de la société ISI – Institute for Scientific Information de Thomson Scientific."
}, {
  "scheme": "http://sm-category.lod.istex.fr",
  "id": "science-metrix",
  "table": "science-metrix.json",
  "label": "Science-Metrix, entreprise indépendante basée aux Etats-Unis et au Canada spécialisée en évaluation des activités liées à la science et à la technologie."
}]
```

Chaque valeur du tableau est un objet représentant une table de correspondances. Ses attributs sont :
  - `scheme` : le scheme de la table.
  - `id` : l'identifiant de la balise *<taxonomy xml:id="">*.
  - `table` : le nom du fichier (qui se trouve dans le répertoire des `tables`).
  - `label`: le texte contenu dans la balise taxonomy.

##### Tables de correspondances #####

Il y a un fichier par `tables` de correspondances (ex : `wos.json`). Il doit être sous la forme :

```json
"0002-9483": [
  [{
    "level": 1,
    "value": "SOCIAL SCIENCE"
  }, {
    "level": 2,
    "value": "ANTHROPOLOGY"
  }],
  [{
    "level": 1,
    "value": "SCIENCE"
  }, {
    "level": 2,
    "value": "EVOLUTIONARY BIOLOGY"
  }]
]
```

Chaque **clé** de l'objet est un **ISSN**, et chaque **valeur** est un **tableau de tableau d'objets** contenant :
  - Chaque tableau est un regroupement de classes, chacune représentée par un objet de type :
    - `level` : niveau de la classification.
    - `value` : libellé de la classification.
  
De cette façon, on peut attribuer plusieurs classes (avec chacune différents niveaux) à chaque ISSN.

## Annexes ##

### Arborescence ###

```
.
├── changelog.md                    // changelog
├── index.js                        // point d'entrée, contenant la fonction doTheJob()
├── newVersion                      // script de version
├── node_modules                    // modules NPM
│   └── ...
├── package.json                    // packages
├── README.md                       // readme
├── resources                       // répertoire des ressources
│   ├── categorizations.json            // catégorisations disponibles
│   ├── config.default.json             // configuration du module
│   ├── fragment.tei.xml.tpl            // template du fragment de TEI
│   ├── paths.json                      // chemins utiles au module
│   └── tables                          // répertoire des tables de correspondances
│       └── ...
└── test                            // répertoire des TU
    ├── dataset                         // répertoire des données de test
    │  └── ...
    └── run.js                          // point d'entrée des TU
```

### Codes d'erreur ###

Plage de codes : 0~99

Code | Signification           | Note(s)
-----|-------------------------|--------
1    | Erreur lecture/écriture |