/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  pkg = require("./package.json"),
  config = require("./config.json"),
  fs = require("fs"),
  path = require("path"),
  Lemmatizer = require("javascript-lemmatizer"),
  snowballFactory = require("snowball-stemmers");

let worker = {};

worker.init = function(options = {
  outputPath: "default"
}) {
  worker.outputPath = options.outputPath || path.join("out/", pkg.name);

  worker.resources = require("teeft-resources");
  worker.Tagger = require("./lib/tagger.js");
  worker.lexicon = require("./lib/lexicon.js");
  worker.DefaultFilter = require("./lib/defaultfilter.js");
  worker.TermExtraction = require("./lib/termextractor.js");

  // Tagger + filter + extractor + lemmatizer
  worker.tagger = new worker.Tagger(worker.lexicon);
  worker.filter = new worker.DefaultFilter({
    "minOccur": 1, // 10 par défaut
    "noLimitStrength": 2 // 2 par défaut
  });
  worker.extractor = new worker.TermExtraction({
    "filter": worker.filter
  });
  worker.lemmatizer = new Lemmatizer();
  worker.stemmer = snowballFactory.newStemmer("english");

  /* Constantes */
  worker.NOW = utils.dates.now(); // Date du jour formatée (string)
  worker.NOT_ALPHANUMERIC = new RegExp("\\W", "g"); // RegExp d"un caractère non alphanumérique
  worker.DIGIT = new RegExp("\\d", "g"); // RegExp d"un chiffre
  worker.NOUN_TAG = new RegExp(/(\|)?N[A-Z]{1,3}(\|)?/g); // RegExp de toutes les formes du tag de nom
  worker.VERB_TAG = new RegExp(/(\|)?V[A-Z]{1,3}(\|)?/g); // RegExp de toutes les formes du tag de verbe
  worker.MAX_NOT_ALPHANUMERIC = 2; // Nombre max de caractère non alpha numérique
  worker.MAX_DIGIT = 2; // Nombre max de numérique
  worker.MIN_LENGTH = 4; // Longueur minimale d"un terme (incluse)
  worker.SPECIFIC_TERM = new RegExp(/^([^a-zA-Z0-9]*|[!\-;:,.?]*)(\w+)([^a-zA-Z0-9]*|[!\-;:,.?]*)$/g); // RegExp permettant de découper un terme entouré par de la ponctuation
  worker.SEPARATOR = "#";
  worker.LOGS = { // Logs des différents cas possibles (et gérés par le module)
    "SUCCESS": "TEI file created at ",
    "ERROR_EXTRACTION": "Extracted terms not found",
    "ERROR_VALIDATION": "Valid terms not found",
    "ERROR_LEMMATIZATION": "Lemmatized terms not found",
    "ERROR_TOKENIZATION": "Tokens not found",
    "ERROR_TAGGER": "Tagged tokens not found"
  };
}

/*
 ** ------------------------------------------------------------------------------
 ** Coeur du Code Métier
 ** ------------------------------------------------------------------------------
 */
worker.doTheJob = function(data, next) {
  // Vérification du type de fichier
  if (data.mimetype !== "text/plain") {
    return next(null, data);
  }

  // Variables d"erreurs et de logs
  data[pkg.name] = {
    errors: [],
    logs: []
  };

  const documentId = path.basename(data.name, ".xml");

  // Lecture du fichier TXT
  fs.readFile(data.path, "utf-8", function(err, txt) {

    // Lecture impossible
    if (err) {
      data[pkg.name].errors.push(err.toString());
      return next(null, data);
    }

    /**
     * Représentation d"un texte dans rd-teeft
     * {
     *   keywords: [], // Mots clés du texte
     *   extraction: [], // Extraction sur tous le texte
     *   terms: { // Toutes les termes présent dans le texte, sous leurs différentes formes
     *     tagged: [], // taggés
     *     sanitized: [], // sanitizés
     *     lemmatized: [], // lemmatizés
     *   },
     *   tokens: [], // Tous les tokens présent dans le texte
     *   statistics: {} // Toutes les statistiques sur le texte
     * }
     */
    const text = worker.index(txt);

    // S"il n"y a aucun tokens dans tout le texte, arrêt des traitements en cours
    if (text.tokens.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_TOKENIZATION);
      return next(null, data);
    }

    // S"il n"y a aucun terme taggé dans tout le texte, arrêt des traitements en cours
    if (text.terms.tagged.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_TAGGER);
      return next(null, data);
    }

    // S"il n"y a aucun terme lemmatizé dans tout le texte, arrêt des traitements en cours
    if (text.terms.lemmatized.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_LEMMATIZATION);
      return next(null, data);
    }

    // S"il n"y a aucun terme sanitizé dans tout le texte, arrêt des traitements en cours
    if (text.terms.sanitized.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_VALIDATION);
      return next(null, data);
    }

    // S"il n"y a aucun terme extrait dans tout le texte, arrêt des traitements en cours
    if (text.extraction.keys.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_EXTRACTION);
      return next(null, data);
    }

    // Construction de la structure de données pour le templates
    const tpl = {
        "date": worker.NOW,
        "module": config, // Infos sur la configuration du module
        "pkg": worker.resources.pkg, // Infos sur le module
        "document": { // Infos sur le document
          "id": documentId,
          "terms": text.keywords // Termes indexés
        }
      },
      // Récupération du directory & filename de l"ouput
      output = utils.files.createPath({
        outputPath: worker.outputPath,
        id: documentId,
        type: "enrichments",
        label: config.label,
        // extension: ["_", config.version, "_", config.resource, ".tei.xml"].join(")
        extension: ".tei.xml"
      });

    // Récupération du fragment de TEI
    utils.enrichments.write({
      "template": worker.resources.template,
      "data": tpl,
      "output": output
    }, function(err) {
      if (err) {
        // Lecture/Écriture impossible
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }

      // Création de l"objet enrichement représentant l"enrichissement produit
      let enrichment = {
        "path": path.join(output.directory, output.filename),
        "extension": "tei",
        "original": false,
        "mime": "application/tei+xml"
      };

      // Sauvegarde de l"enrichissement dans le data
      data.enrichments = utils.enrichments.save(data.enrichments, {
        "enrichment": enrichment,
        "label": config.label
      });

      // Tout s"est bien passé
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.SUCCESS + output.filename);
      return next(null, data);
    });
  });
};

/**
 * Tokenize un texte
 * @param {String} text Texte à tokenizer
 * @return {Array} Liste des termes nettoyés
 */
worker.tokenize = function(text) {
  const words = text.split(/\s/g);
  let result = [];
  for (let i = 0; i < words.length; i++) {
    const term = words[i].toLowerCase();
    // Now, a word can be preceded or succeeded by symbols, so let"s
    // split those out
    let match;
    while (match = worker.SPECIFIC_TERM.exec(term)) {
      for (let j = 1; j < match.length; j++) {
        if (match[j].length > 0) {
          if (j === 2) {
            result.push(match[j]);
          } else {
            result.push(worker.SEPARATOR);
          }
        }
      }
    }
  }
  return result;
};

/**
 * Retourne la traduction du tag
 * @param {str} tag Tag affecté par la classe Tagger
 * @return {str} tag compris par la classe Lemmatizer ou false
 */
worker.translateTag = function(tag) {
  let result = false;
  if (tag === "RB") {
    result = "adv";
  } else if (tag === "JJ") {
    result = "adj";
  } else if (tag.match(worker.NOUN_TAG)) {
    result = "noun";
  } else if (tag.match(worker.VERB_TAG)) {
    result = "verb";
  }
  return result;
};

/**
 * Filtre les termes ne respectant pas les conditions
 * @param {Array} terms Termes à filtrer
 * @return {Array} Liste de termes filtrés
 */
worker.sanitize = function(terms) {
  let result = [];
  const invalid = worker.tagger.tag(worker.SEPARATOR)[0];
  for (let i = 0; i < terms.length; i++) {
    let value = invalid;
    if (terms[i].term.length >= worker.MIN_LENGTH) {
      const na = terms[i].term.match(worker.NOT_ALPHANUMERIC),
        d = terms[i].term.match(worker.DIGIT);
      if ((!na || na.length <= worker.MAX_NOT_ALPHANUMERIC) && (!d || d.length < worker.MAX_DIGIT) && (!worker.resources.stopwords[terms[i].stem])) {
        value = terms[i];
      }
    }
    result.push(value);
  }
  return result;
};

/**
 * Lemmatize des termes taggés (en traduisant le tag)
 * @param {Array} terms Termes taggés à lemmatizer
 * @return {Array} Liste de termes lemmatizé
 */
worker.lemmatize = function(terms) {
  let result = [];
  for (let i = 0; i < terms.length; i++) {
    const trslTag = worker.translateTag(terms[i].tag);
    let lemma = terms[i].term;

    // Si la traduction est possible
    if (trslTag) {
      const _lemma = worker.lemmatizer.lemmas(terms[i].term, trslTag);
      if (_lemma.length > 0) {
        lemma = _lemma[_lemma.length - 1][0]; // Récupération du terme lemmatizé
      }
    }
    result.push({
      term: terms[i].term,
      tag: terms[i].tag,
      lemma: lemma,
      stem: worker.stemmer.stem(terms[i].term)
    });
  }
  return result;
};

/**
 * Compare deux objets entre eux en fonction de leur propriété "specificity"
 * @param {Object} a Objet a
 * @return {Object} b Objet b
 */
worker.compare = function(a, b) {
  if (a.specificity > b.specificity)
    return -1;
  else if (a.specificity < b.specificity)
    return 1;
  else
    return 0;
};

/**
 * Index du text
 * @param {String} data Données à indexer, sous forme de chaîne de caractères
 * @return {Object} Retourne une représentation du text indexé
 */
worker.index = function(data) {
  // Représentation d'un texte par défaut
  const text = {
    "keywords": [], // Mots clés du texte
    "extraction": { // Extraction sur tout le texte
      "terms": {},
      "keys": []
    },
    "terms": { // Toutes les termes présent dans le texte, sous leurs différentes formes
      "tagged": [], // taggés
      "sanitized": [], // sanitizés
      "lemmatized": [] // lemmatizés
    },
    "tokens": [], // Tous les tokens présent dans le texte
    "statistics": { // Toutes les statistiques sur le texte
      // fréquences
      "frequencies": {
        "max": 0,
        "total": 0
      },
      // spécificités
      "specificities": {
        "avg": 0,
        "max": 0
      }
    }
  };

  // Tokenization du texte & Ajout d"une séparation à la fin de chaque segment de texte (pour l"extraction)
  text.tokens = worker.tokenize(data);

  // S"il n"y a aucun tokens dans tout le texte, arrêt des traitements en cours
  if (text.tokens.length === 0) return text;

  // Tag des tokens
  text.terms.tagged = worker.tagger.tag(text.tokens);

  // S"il n"y a aucun terme taggé dans tout le texte, arrêt des traitements en cours
  if (text.terms.tagged.length === 0) return text;

  // Lemmatization des termes taggés
  text.terms.lemmatized = worker.lemmatize(text.terms.tagged);

  // S"il n"y a aucun terme lemmatizé dans tout le texte, arrêt des traitements en cours
  if (text.terms.lemmatized.length === 0) return text;

  // Retrait de tous les termes qui ne correspondent pas au format souhaité
  text.terms.sanitized = worker.sanitize(text.terms.lemmatized);

  // S"il n"y a aucun terme sanitizé dans tout le texte, arrêt des traitements en cours
  if (text.terms.sanitized.length === 0) return text;

  // Configuration du Filter
  worker.extractor.get("filter").configure(text.tokens.length);

  // Exctraction des termes
  text.extraction.terms = worker.extractor.extract(text.terms.sanitized); // Données sous forme d"objet
  text.extraction.keys = Object.keys(text.extraction.terms); // Liste des termes extraits

  // S"il n"y a aucun terme extrait dans tout le texte, arrêt des traitements en cours
  if (text.extraction.keys.length === 0) return text;

  // Calcul des statistiques sur les fréquences d"apparitions de chaque terme
  for (let i = 0; i < text.extraction.keys.length; i++) {

    // Clé du term dans text.extraction.terms
    const key = text.extraction.keys[i];

    // Fréquence maximale pour ce texte
    if (text.statistics.frequencies.max < text.extraction.terms[key].frequency) {
      text.statistics.frequencies.max = text.extraction.terms[key].frequency;
    }

    // Fréquence totale pour ce texte
    text.statistics.frequencies.total += text.extraction.terms[key].frequency;
  }

  // Valeur par défaut
  let dValue = Math.pow(10, -5);

  // Calcul des scores de chaque terme + Calcul du total des fréquences
  for (let i = 0; i < text.extraction.keys.length; i++) {

    // Clé du term dans text.extraction.terms
    const key = text.extraction.keys[i];

    // Valeur de la pondération du terme qui dépend de sa "représentativité" dans le vocabulaire (dictionnary.json)
    const weighting = worker.resources.dictionary[key] || dValue;

    // Specificité = (fréquence d"apparition du terme) / (pondération)
    text.extraction.terms[key].specificity = ((text.extraction.terms[key].frequency / text.statistics.frequencies.total) / weighting);

    // Calcul de la spécificité maximale de ce segment
    if (text.statistics.specificities.max < text.extraction.terms[key].specificity) {
      text.statistics.specificities.max = text.extraction.terms[key].specificity;
    }
  }

  // Normalisation de la spécificité de chaque terme présent dans le texte & Somme de toutes les spécificités normalisée
  for (let i = 0; i < text.extraction.keys.length; i++) {

    // Clé du term dans text.extraction.terms
    const key = text.extraction.keys[i];

    text.extraction.terms[key].specificity /= text.statistics.specificities.max;
    text.statistics.specificities.avg += text.extraction.terms[key].specificity;
  }

  // Calcul de la spécificité moyenne dans tout le document
  text.statistics.specificities.avg /= text.extraction.keys.length;

  // Liste des termes indexés
  text.keywords = [];

  // Sélection des résultats finaux
  for (let i = 0; i < text.extraction.keys.length; i++) {

    // Clé du term dans text.extraction.terms
    const key = text.extraction.keys[i];

    if (!config.truncate || (text.extraction.terms[key].specificity >= text.statistics.specificities.avg)) {
      text.extraction.terms[key].term = key;
      text.keywords.push(text.extraction.terms[key]);
    }
  }

  // Si le résultat doit être trié
  if (config.sort) {
    text.keywords = text.keywords.sort(worker.compare);
  }
  return text;
};

module.exports = worker;