multicat
===============

## Summary ##

**multicat** module try to assing some categories to an XML document by using its identifiers.

## Configuration ##

An exemple of this module configuration (ISTEX conf here)

```json
{
  "multicat": {
    "module": {
      "label": "rd-multicat",
      "resp": {
        "id": "istex-rd",
        "label": "ISTEX-RD"
      },
      "resources": "sm-wos-scopus"
    },
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
    "template": "fragment.tei.xml.tpl",
    "output": {
      "extension": ".tei.xml",
      "mime": "application/tei+xml",
      "type": "enrichment"
    },
    "enrichment": {
      "original": false,
      "extension": "tei"
    }
  }
```

## Ressources ##

### Template ###

Data sent to the template are :
```js
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
};
```

Detailled view of data :

```json
{
  "date": "02-11-2017",
  "module": {
    "label": "rd-multicat",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    },
    "resources": "test"
  },
  "pkg": { ... },
  "document": {
    "id": "SUCCESS.mods",
    "categories": [{
      "id": "test",
      "values": [
        [{
          "level": 1,
          "value": "value1"
        }, {
          "level": 2,
          "value": "value2"
        }],
        [{
          "level": 1,
          "value": "value1"
        }, {
          "level": 2,
          "value": "value2"
        }]
      ]
    }]
  },
  "categorizations": [{
    "scheme": "test",
    "identifier": "identifier[type=\"ISSN\"]",
    "id": "test",
    "file": "tables/test.json",
    "label": "test"
  }]
}
```

More infos about how to use tpl syntax at [documentation](https://github.com/raycmorgan/Mu)

### Tables ###

All infos about `tables` are in a configuration file (`/conf/sisyphe-conf.json`). ISTEX configuration looks like :

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

A file of a `tables` (like `wos.json`) should be like :

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