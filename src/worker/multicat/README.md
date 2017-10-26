multicat
===============

## Summary ##

**multicat** module search for identifier in an XML document and try to assign it some categories.

## Ressources ##

### Template ###

Path to template file : `conf/fragment.tei.xml.tpl`

Data sent to the template are :
```js
// index.js l.78
// Build the structure of the template
const tpl = {
    "date": worker.NOW, // Current date
    "module": config, // Configuration of module
    "pkg": pkg, // Infos on module packages
    "document": { // Data of document
      "id": documentId,
      "categories": categories
    },
    categorizations: worker.resources.categorizations // Infos on used categorizations
  },
```

Detailled :

```json
{ date: '26-10-2017',
  module: 
   { id: 'rd-multicat',
     label: 'multicat',
     resp: { id: 'istex-rd', label: 'ISTEX-RD' },
     resources: 'sm-wos-scopus' },
  pkg: 
   { name: 'multicat',
     version: '1.0.0',
     description: 'Module Sisyphe de catégorisation par méthode par appariemment',
     main: 'index.js',
     scripts: { test: 'mocha -t 120000' },
     keywords: [],
     author: 'NicolasKieffer',
     license: 'GNU',
     dependencies: 
      { async: '^2.5.0',
        'auto-tu': 'git+https://github.com/NicolasKieffer/auto-tu.git',
        mocha: '^3.5.3',
        'worker-utils': 'git+https://github.com/NicolasKieffer/worker-utils.git' } },
  document: 
   { id: 'SUCCESS.mods',
     categories: [ [Object], [Object], [Object] ] },
  categorizations: 
   [ { scheme: 'https://wos-category.data.istex.fr',
       identifier: 'identifier[type="ISSN"]',
       id: 'wos',
       file: 'tables/wos.json',
       label: 'Web of Science (WoS) service d’information universitaire en ligne de la société ISI – Institute for Scientific Information de Thomson Scientific.' },
     { scheme: 'https://sciencemetrix-category.data.istex.fr',
       identifier: 'identifier[type="ISSN"]',
       id: 'science-metrix',
       file: 'tables/science-metrix.json',
       label: 'Science-Metrix, entreprise indépendante basée aux Etats-Unis et au Canada spécialisée en évaluation des activités liées à la science et à la technologie.' },
     { scheme: 'https://scopus-category.data.istex.fr',
       identifier: 'identifier[type="ISSN"]',
       id: 'scopus',
       file: 'tables/scopus.json',
       label: 'Scopus, base de données transdisciplinaire lancée par l\'éditeur scientifique Elsevier.' } ] }
```

More infos about how to use tpl syntax at [documentation](https://github.com/raycmorgan/Mu)

### Tables ###

All `tables` will be stored (by default : `/conf/tables`). A configuration file (`/conf/sisyphe-conf.json`) list all infos about them like :

```json
{
  "root": "conf",
  "multicat": {
    "label": "rd-multicat",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    },
    "resources": "sm-wos-scopus",
    "categorizations": [{
      "scheme": "https://wos-category.data.istex.fr",
      "identifier": "identifier[type=\"ISSN\"]",
      "id": "wos",
      "file": "tables/wos.json",
      "label": "Web of Science (WoS) service d’information universitaire en ligne de la société ISI – Institute for Scientific Information de Thomson Scientific."
    }, {
      "scheme": "https://sciencemetrix-category.data.istex.fr",
      "identifier": "identifier[type=\"ISSN\"]",
      "id": "science-metrix",
      "file": "tables/science-metrix.json",
      "label": "Science-Metrix, entreprise indépendante basée aux Etats-Unis et au Canada spécialisée en évaluation des activités liées à la science et à la technologie."
    }, {
      "scheme": "https://scopus-category.data.istex.fr",
      "identifier": "identifier[type=\"ISSN\"]",
      "id": "scopus",
      "file": "tables/scopus.json",
      "label": "Scopus, base de données transdisciplinaire lancée par l'éditeur scientifique Elsevier."
    }],
    "tables": {},
    "template": "fragment.tei.xml.tpl"
  }
}
```

Files of all `tables` (like `wos.json`) should be like :

```json
{
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
}
```