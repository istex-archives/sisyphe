/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  pkg = require("./package.json"),
  fs = require("fs"),
  path = require("path"),
  Lemmatizer = require("javascript-lemmatizer"),
  snowballFactory = require("snowball-stemmers");

const worker = {};

/**
 * Init Function (called by sisyphe)
 * @param {Object} options Options passed by sisyphe
 * @return {undefined} Return undefined
 */
worker.init = function(options) {
  worker.outputPath = options.outputPath || path.join("out/", pkg.name);
  worker.resources = worker.load(options);
  worker.Tagger = require("./lib/tagger.js");
  worker.lexicon = require("./lib/lexicon.js");
  worker.DefaultFilter = require("./lib/defaultfilter.js");
  worker.TermExtraction = require("./lib/termextractor.js");
  // Tagger + filter + extractor + lemmatizer
  worker.tagger = new worker.Tagger(worker.lexicon);
  worker.filter = new worker.DefaultFilter(worker.resources.parameters.filter);
  worker.extractor = new worker.TermExtraction({
    "filter": worker.filter
  });
  worker.lemmatizer = new Lemmatizer();
  worker.stemmer = snowballFactory.newStemmer("english");
  worker.NOT_ALPHANUMERIC = new RegExp("\\W", "g"); // RegExp of alphanumerique char
  worker.DIGIT = new RegExp("\\d", "g"); // RegExp of number
  worker.NOUN_TAG = new RegExp(/(\|)?N[A-Z]{1,3}(\|)?/g); // RegExp of noun tag
  worker.VERB_TAG = new RegExp(/(\|)?V[A-Z]{1,3}(\|)?/g); // RegExp of verb tag
  worker.MAX_NOT_ALPHANUMERIC = 2; // limit of alphanumeric char
  worker.MAX_DIGIT = 2; // Limit of digit
  worker.MIN_LENGTH = 4; // Minimum length of token
  worker.SPECIFIC_TERM = new RegExp(/^([^a-zA-Z0-9]*|[!\-;:,.?]*)(\w+)([^a-zA-Z0-9]*|[!\-;:,.?]*)$/g); // RegExp of a term between punctuation
  worker.SEPARATOR = "#"; // Char separator
  worker.LOGS = { // All logs available on this module
    "SUCCESS": "File created at ",
    "ERROR_EXTRACTION": "Extracted terms not found",
    "ERROR_VALIDATION": "Valid terms not found",
    "ERROR_LEMMATIZATION": "Lemmatized terms not found",
    "ERROR_TOKENIZATION": "Tokens not found",
    "ERROR_TAGGER": "Tagged tokens not found"
  };
}

/**
 * Index a fulltext (called by sisyphe)
 * @param {Object} data data of the current docObject
 * @param {Function} next Callback funtion
 * @return {undefined} Asynchronous function
 */
worker.doTheJob = function(data, next) {
  // Check resources are correctly loaded & MIME type of file
  if (!worker.resources || data.mimetype !== worker.resources.parameters.input.mimetype) {
    return next(null, data);
  }
  // Errors & logs
  data[pkg.name] = {
    errors: [],
    logs: []
  };
  // Get the filename (without extension)
  const documentId = path.basename(data.name, data.extension || worker.resources.parameters.input.extension);
  // Read TXT file
  fs.readFile(data.path, "utf-8", function(err, txt) {
    // I/O Errors
    if (err) {
      data[pkg.name].errors.push(err.toString());
      return next(null, data);
    }
    // Get the text representation
    const text = worker.index(txt);
    // If there is no token, log it
    if (text.tokens.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_TOKENIZATION);
      return next(null, data);
    }
    // If there is no tagged term, log it
    if (text.terms.tagged.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_TAGGER);
      return next(null, data);
    }
    // If there is no lemmatized term, log it
    if (text.terms.lemmatized.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_LEMMATIZATION);
      return next(null, data);
    }
    // If there is no sanitized term, log it
    if (text.terms.sanitized.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_VALIDATION);
      return next(null, data);
    }
    // If there is no extracted term, log it
    if (text.extraction.keys.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_EXTRACTION);
      return next(null, data);
    }
    worker.NOW = utils.dates.now(); // Date du jour formatée (string)
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
      },
      // Build path & filename of enrichment file
      output = utils.files.createPath({
        "outputPath": worker.outputPath,
        "id": documentId,
        "type": worker.resources.output.type,
        "label": pkg.name,
        "extension": worker.resources.output.extension
      });
    // Write enrichment data
    utils.enrichments.write({
      "template": worker.resources.template,
      "data": tpl,
      "output": output
    }, function(err) {
      if (err) {
        // I/O Error
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }
      // Create an Object representation of created enrichment
      const enrichment = {
        "path": path.join(output.directory, output.filename),
        "extension": worker.resources.enrichment.extension,
        "original": worker.resources.enrichment.original,
        "mimetype": worker.resources.output.mimetype
      };
      // Save enrichments in data
      data.enrichments = utils.enrichments.save(data.enrichments, {
        "enrichment": enrichment,
        "label": worker.resources.module.label
      });
      // All clear
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.SUCCESS + output.filename);
      return next(null, data);
    });
  });
};

/**
 * Extract token from a text
 * @param {String} text Fulltext
 * @return {Array} Array of tokens
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
 * Translate the tag of Tagger to Lemmatizer
 * @param {String} tag Tag given by Tagger
 * @return {String} Tag who match with a Lemmatizer tag (or false)
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
 * Sanitize list of terms (with some filter)
 * @param {Array} terms List of terms
 * @return {Array} Liste of sanitized terms
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
 * Lemmatize a list of tagged terms (add a property lemma & stem)
 * @param {Array} terms List of tagged terms
 * @return {Array} List of tagged terms with a lemma
 */
worker.lemmatize = function(terms) {
  let result = [];
  for (let i = 0; i < terms.length; i++) {
    const trslTag = worker.translateTag(terms[i].tag);
    let lemma = terms[i].term;
    // If translation is possible
    if (trslTag) {
      const _lemma = worker.lemmatizer.lemmas(terms[i].term, trslTag);
      if (_lemma.length > 0) {
        lemma = _lemma[_lemma.length - 1][0]; // Get the first lemma
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
 * Compare the specificity of two objects between them
 * @param {Object} a First object
 * @param {Object} b Second object
 * @return {Number} -1, 1, or 0
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
 * Index a fulltext
 * @param {String} data Fulltext who need to be indexed
 * @return {Object} Return a representation of the fulltext (indexation & more informations/statistics about tokens/terms)
 */
worker.index = function(data) {
  // Default value
  const text = {
    "keywords": [], // Keywords
    "extraction": { // Extraction (terms)
      "terms": {},
      "keys": []
    },
    "terms": { // All terms
      "tagged": [], // tagged
      "sanitized": [], // sanitized
      "lemmatized": [] // lemmatized
    },
    "tokens": [], // Token from fulltext
    "statistics": { // Somme statistics about 
      // frequencies
      "frequencies": {
        "max": 0,
        "total": 0
      },
      // specificities
      "specificities": {
        "avg": 0,
        "max": 0
      }
    }
  };
  // Get tokens
  text.tokens = worker.tokenize(data);
  // If there is no token, end of process
  if (text.tokens.length === 0) return text;
  // Tag des tokens
  text.terms.tagged = worker.tagger.tag(text.tokens);
  // If there is no tagged term, end of process
  if (text.terms.tagged.length === 0) return text;
  // Lemmatize tagged terms
  text.terms.lemmatized = worker.lemmatize(text.terms.tagged);
  // If there is no lemmatized term, end of process
  if (text.terms.lemmatized.length === 0) return text;
  // Sanitize all lemmatized terms
  text.terms.sanitized = worker.sanitize(text.terms.lemmatized);
  // If there is no sanitized term, end of process
  if (text.terms.sanitized.length === 0) return text;
  // Configure Filter
  worker.extractor.get("filter").configure(text.tokens.length);
  // Extract terms
  text.extraction.terms = worker.extractor.extract(text.terms.sanitized);
  text.extraction.keys = Object.keys(text.extraction.terms); // List of keys
  // If there is no extracted term, end of process
  if (text.extraction.keys.length === 0) return text;
  // Calculate some statistics of fréquencies
  for (let i = 0; i < text.extraction.keys.length; i++) {
    // Key in text.extraction.terms
    const key = text.extraction.keys[i];
    // Max frequency
    if (text.statistics.frequencies.max < text.extraction.terms[key].frequency) {
      text.statistics.frequencies.max = text.extraction.terms[key].frequency;
    }
    // Total frequency
    text.statistics.frequencies.total += text.extraction.terms[key].frequency;
  }
  // Default value
  let dValue = Math.pow(10, -5);
  // Calculate of scores for each term & Calculate the total of frequencies
  for (let i = 0; i < text.extraction.keys.length; i++) {
    // Key in text.extraction.terms
    const key = text.extraction.keys[i];
    // Value of term weighting in function of its representativity in the vocabulary (dictionnary.json)
    const weighting = worker.resources.dictionary[key] || dValue;
    // Specificity = (frequency) / (weighting)
    text.extraction.terms[key].specificity = ((text.extraction.terms[key].frequency / text.statistics.frequencies.total) / weighting);
    // Calculate the max specificity
    if (text.statistics.specificities.max < text.extraction.terms[key].specificity) {
      text.statistics.specificities.max = text.extraction.terms[key].specificity;
    }
  }
  // Normalize the specificity of each term & Sum of all normalized specificities
  for (let i = 0; i < text.extraction.keys.length; i++) {
    // Key in text.extraction.terms
    const key = text.extraction.keys[i];
    text.extraction.terms[key].specificity /= text.statistics.specificities.max;
    text.statistics.specificities.avg += text.extraction.terms[key].specificity;
  }
  // Calcul of average specificity
  text.statistics.specificities.avg /= text.extraction.keys.length;
  // Liste of indexed terms (keywords)
  text.keywords = [];
  // Select final results
  for (let i = 0; i < text.extraction.keys.length; i++) {
    // Key in text.extraction.terms
    const key = text.extraction.keys[i];
    if (!worker.resources.parameters.truncate || (text.extraction.terms[key].specificity >= text.statistics.specificities.avg)) {
      text.extraction.terms[key].term = key;
      text.keywords.push(text.extraction.terms[key]);
    }
  }
  // If result need to be sorted
  if (worker.resources.parameters.sort) {
    text.keywords = text.keywords.sort(worker.compare);
  }
  return text;
};

/**
 * Load all resources needed in this module
 * @param {Object} options Options passed by sisyphe
 * @return {Object} An object containing all the data loaded
 */
worker.load = (options) => {
  let result = options.config[pkg.name];
  const folder = options.sharedConfigDir ? path.resolve(options.sharedConfigDir, pkg.name) : null;
  if (folder && result) {
    result.dictionary = require(path.join(folder, result.dictionary));
    result.stopwords = require(path.join(folder, result.stopwords));
    result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
  } else {
    result = require("./conf/sisyphe-conf.json");
  }
  return result;
};

module.exports = worker;