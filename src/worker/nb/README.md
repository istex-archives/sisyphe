nb
===============

## Summary ##

**nb** module try to assing some categories to an XML document by using its abstract. It's based on a Naive Bayesian method.

## Configuration ##

An exemple of this module configuration (ISTEX conf here)

```json
{
  "nb": {
    "parameters": {
      "lang": "en",
      "cld": {
        "code": "en",
        "percent": 90
      },
      "probability": {
        "min": 0.12
      }
    },
    "module": {
      "label": "rd-nb",
      "resp": {
        "id": "istex-rd",
        "label": "ISTEX-RD"
      },
      "resources": "pascal-francis"
    },
    "trainings": {
      "entry": "trainings/SHS-STM.json",
      "SHS": "trainings/SHS.json",
      "STM": "trainings/001-002.json",
      "001": "trainings/001.json",
      "001A": "trainings/001A.json",
      "001B": "trainings/001B.json",
      "001C": "trainings/001C.json",
      "001D": "trainings/001D.json",
      "001E": "trainings/001E.json",
      "002": "trainings/002.json",
      "002A": "trainings/002A.json",
      "002B": "trainings/002B.json"
    },
    "verbalization": "verbalization.json",
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
    "categories": categories
  }
};
```

Detailled view of data :

```json
{
  "date": "02-11-2017",
  "module": {
    "label": "rd-nb",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    },
    "resources": "test"
  },
  "parameters": {
    "lang": "en",
    "cld": {
      "code": "en",
      "percent": 90
    },
    "probability": {
      "min": 0.12
    }
  },
  "pkg": { ... },
  "document": {
    "id": "SUCCESS.mods",
    "categories": [{
      "code": "letter",
      "probability": 0.9999,
      "verbalization": "class of letter",
      "level": 1
    }]
  }
}
```

More infos about how to use tpl syntax at [documentation](https://github.com/raycmorgan/Mu)

### Trainings ###

The script used to build trainings is `train.js`. If you want to test the result you can use the second script `test.js`.
Generated files are used by module to classify. First training used is the "entry" training.

###### train.js ######

```bash
node train.js --input=my/path/train.txt --output=my/path/train.json --separator=";"
```

###### test.js ######

```bash
node test.js --input=my/path/train.txt --output=test.csv --separator=";"
```

###### nb.js ######

Most used funtion :
  - `nb.train(label, text)` : Train nb with the given text.
  - `nb.save(path, callback)` : Save the nb trainings at the given path.
  - `nb.load(trainings)` : Load trainings.
  - `nb.guess(text)` : Try to guess classification of the given text.

#### Exemple ####

Let's see what could happend if ISTEX trainings are used with nb.

Possible result of each training files :

```
SHS-STM.json
  ├── SHS
  └── STM

STM.json
  ├── 001
  └── 002

001.json
  ├── 001A
  ├── 001B
  ├── 001C
  ├── 001D
  └── 001E

002.json
  ├── 002A
  └── 002B

001B.json
  ├── 001B00
  ├── ...
  ├── 001B50
  └── ...

[...]
```

All possible cases :

```
entry ┬──> SHS
      └──> STM ┬──> 001 ┬──> 001A
               │        ├──> 001B
               │        ├──> 001C
               │        ├──> 001D
               │        └──> 001E
               └──> 002 ┬──> 002A
                        └──> 002B
```

#### Detailled explications ####

1. *`entry` case* (1st classification), there are *3* possible ways :
  - `STM` --> next training will be **STM**.
  - `SHS` --> next training will be **SHS**.
  - *nb failed to guess, end of classification.*

2. *`STM` was the previous result* (2nd classification), there are *3* possible ways :
  - `001` --> next training will be **001**.
  - `001` --> next training will be **001**.
  - *nb failed to guess, end of classification.*

3. *`001` was the previous result* (3rd classification), there is  *6* possible ways :
  - `001A` --> next training will be **001A**.
  - ...
  - `001E` --> next training will be **001E**.
  - *nb failed to guess, end of classification.*

4. *`001B` was the previous result* (4th classification), il y a *X* possible ways :
  - `001B00` --> *No more training file, end of classification.*
  - ...
  - `001B50` --> *No more training file, end of classification.*
  - ...
  - *nb failed to guess, end of classification.*