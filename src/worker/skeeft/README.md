skeeft
===============

## Summary ##

**skeeft** module extract keywords of a structured fulltext by using teeft algorithm and text structuration.

## Configuration ##

An exemple of this module configuration (ISTEX conf here)

```json
{
  "skeeft": {
    "parameters": {
      "input": {
        "mimetype": "application/xml",
        "extension": ".xml"
      },
      "lang": "en",
      "truncate": true,
      "sort": true,
      "selectors": {
        "title": "title",
        "segments": [
          "abstract",
          "introduction",
          "methods_and_materials",
          "results",
          "discussion"
        ]
      },
      "criterion": "frequency",
      "filters": {
        "title": {
          "minOccur": 1,
          "noLimitStrength": 2,
          "lengthSteps": {
            "values": [],
            "min": {
              "lim": 1,
              "value": 1
            },
            "max": {
              "lim": 1,
              "value": 1
            }
          }
        },
        "fulltext": {
          "minOccur": 1,
          "noLimitStrength": 2,
          "lengthSteps": {
            "values": [],
            "min": {
              "lim": 1,
              "value": 1
            },
            "max": {
              "lim": 1,
              "value": 1
            }
          }
        }
      }
    },
    "module": {
      "label": "rd-skeeft",
      "resp": {
        "id": "istex-rd",
        "label": "ISTEX-RD"
      },
      "resource": "teeft"
    },
    "template": "fragment.tei.xml.tpl",
    "output": {
      "extension": ".tei.xml",
      "mimetype": "application/tei+xml",
      "type": "enrichment"
    },
    "enrichment": {
      "original": false,
      "extension": "tei"
    }
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
  "module": worker.resources.module, // Configuration of module
  "parameters": worker.resources.parameters, // Launch parameters of module
  "pkg": pkg, // Infos on module packages
  "document": { // Data of document
    "id": documentId,
    "terms": terms // Selected terms
  }
};
```

Detailled view of data :

```json
{
  "date": "07-11-2017",
  "module": {
    "label": "rd-skeeft",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    },
    "resource": "teeft"
  },
  "parameters": { ... },
  "pkg": { ... },
  "document": {
    "id": "SUCCESS",
    "terms": [ ... ]
  }
}
```

More infos about how to use tpl syntax at [documentation](https://github.com/raycmorgan/Mu)

## Indexation ##

