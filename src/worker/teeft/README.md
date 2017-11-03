teeft
===============

## Summary ##

**teeft** module index a fulltext.

## Configuration ##

An exemple of this module configuration (ISTEX conf here)

```json
{
  "teeft": {
    "parameters": {
      "lang": "en",
      "truncate": true,
      "sort": true
    },
    "module": {
      "label": "rd-nb",
      "resp": {
        "id": "istex-rd",
        "label": "ISTEX-RD"
      },
      "resources": "brown"
    },
    "template": "fragment.tei.xml.tpl",
    "dictionary": "dictionary.json",
    "stopwords": "stopwords.json",
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
    "terms": text.keywords
  }
};
```

Detailled view of data :

```json{
  "date": "03-11-2017",
  "document": {
    "id": "SUCCESS",
    "terms": [...]
  },
  "module": {
    "label": "rd-teeft",
    "resources": "test",
    "resp": {
      "id": "istex-rd",
      "label": "ISTEX-RD"
    }
  },
  "parameters": {
    "lang": "en",
    "sort": true,
    "truncate": true
  },
  "pkg": {...}
}
```

More infos about how to use tpl syntax at [documentation](https://github.com/raycmorgan/Mu)


### stopwords.json ###

This file store all terms who need to be ignored.

```json
{
  "it": true,
  "the": true,
  "all": true
}
```

**Only *`stem`* of stopwords is writed in this file. In the `Sanitization` function, each term is *"stemmed"* before compare.**

### dictionary.json ###

This file store all weighted terms.

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

## Indexation ##

There is 5 steps in indexation :

  - `Tokenization` : split text into `tokens`.
  - `Tag` : Tag all `tokens`.
  - `Lemmatization` : Lemmatize all tagged `tokens`.
  - `Sanitization` : "Clean" terms (clear stopwords, etc).
  - `Extraction` : Extract term for indexation depending on filters.

### Tokenization ###

Used separators are all white spaces and punctuation.

### Tag ###

A `token` is tagged by default like a Name.

### Lemmatization ###

`Tokens` are lemmatized depending on its tag.

### Sanitization ###

At this step, only `tokens` who match with criteria of teeft are kept :

  - is not a stopwords.
  - is tagged as name or adjective.
  - has a correct lenth.
  - has a corerct number of special char or number.

The others can't be indexed by teeft.

### Extraction ###

Once sanitization done, the extractor will try to regroup multi-terms when it's possible (noun + noun, adjective + noun, etc) and calculate somr statistics (frequency, specificity, etc).
Only *terms* with specificity **above the average specificity**  are selected.