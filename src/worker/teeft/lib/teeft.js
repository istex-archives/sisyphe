/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  Lemmatizer = require("javascript-lemmatizer"),
  snowballFactory = require("snowball-stemmers"),
  Tagger = require("./tagger.js"),
  DefaultFilter = require("./defaultfilter.js"),
  lexicon = require("./lexicon.js"),
  TermExtraction = require("./termextractor.js");

/**
 * Constructor
 * @param {Object} options Options of constructor
 * @return this
 */
const Teeft = function(options) {
  const filterOpts = (options && options.filter) ? {
    "filter": new DefaultFilter(options.filter)
  } : {};
  // Tagger + filter + extractor + lemmatizer
  this.tagger = new Tagger(lexicon);
  this.extractor = new TermExtraction(filterOpts);
  this.lemmatizer = new Lemmatizer();
  this.stemmer = snowballFactory.newStemmer("english");
  this.stopwords = (options && options.stopwords) ? options.stopwords : {};
  this.dictionary = (options && options.dictionary) ? options.dictionary : {};
  this.NOT_ALPHANUMERIC = new RegExp("\\W", "g"); // RegExp of alphanumerique char
  this.DIGIT = new RegExp("\\d", "g"); // RegExp of number
  this.NOUN_TAG = new RegExp(/(\|)?N[A-Z]{1,3}(\|)?/g); // RegExp of noun tag
  this.VERB_TAG = new RegExp(/(\|)?V[A-Z]{1,3}(\|)?/g); // RegExp of verb tag
  this.MAX_NOT_ALPHANUMERIC = 2; // limit of alphanumeric char
  this.MAX_DIGIT = 2; // Limit of digit
  this.MIN_LENGTH = 4; // Minimum length of token
  this.SPECIFIC_TERM = new RegExp(/^([^a-zA-Z0-9]*|[!\-;:,.?]*)(\w+)([^a-zA-Z0-9]*|[!\-;:,.?]*)$/g); // RegExp of a term between punctuation
  this.SEPARATOR = "#"; // Char separator
  return this;
};

/* Static const */
Teeft.statistics = {
  "frequency": "frequency",
  "specificity": "specificity",
  "probability": "probability"
};

/**
 * Extract token from a text
 * @param {String} text Fulltext
 * @return {Array} Array of tokens
 */
Teeft.prototype.tokenize = function(text) {
  const words = text.split(/\s/g);
  let result = [];
  for (let i = 0; i < words.length; i++) {
    const term = words[i].toLowerCase();
    // Now, a word can be preceded or succeeded by symbols, so let"s
    // split those out
    let match;
    while (match = this.SPECIFIC_TERM.exec(term)) {
      for (let j = 1; j < match.length; j++) {
        if (match[j].length > 0) {
          if (j === 2) {
            result.push(match[j]);
          } else {
            result.push(this.SEPARATOR);
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
Teeft.prototype.translateTag = function(tag) {
  let result = false;
  if (tag === "RB") {
    result = "adv";
  } else if (tag === "JJ") {
    result = "adj";
  } else if (tag.match(this.NOUN_TAG)) {
    result = "noun";
  } else if (tag.match(this.VERB_TAG)) {
    result = "verb";
  }
  return result;
};

/**
 * Sanitize list of terms (with some filter)
 * @param {Array} terms List of terms
 * @return {Array} Liste of sanitized terms
 */
Teeft.prototype.sanitize = function(terms) {
  let result = [];
  const invalid = this.tagger.tag(this.SEPARATOR)[0];
  for (let i = 0; i < terms.length; i++) {
    let value = invalid;
    if (terms[i].term.length >= this.MIN_LENGTH) {
      const na = terms[i].term.match(this.NOT_ALPHANUMERIC),
        d = terms[i].term.match(this.DIGIT);
      if ((!na || na.length <= this.MAX_NOT_ALPHANUMERIC) && (!d || d.length < this.MAX_DIGIT) && (!this.stopwords[terms[i].lemma])) {
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
Teeft.prototype.lemmatize = function(terms) {
  let result = [];
  for (let i = 0; i < terms.length; i++) {
    const trslTag = this.translateTag(terms[i].tag);
    let lemma = terms[i].term;
    // If translation is possible
    if (trslTag) {
      const _lemma = this.lemmatizer.lemmas(terms[i].term, trslTag);
      if (_lemma.length > 0) {
        lemma = _lemma[_lemma.length - 1][0]; // Get the first lemma
      }
    }
    result.push({
      term: terms[i].term,
      tag: terms[i].tag,
      lemma: lemma,
      stem: this.stemmer.stem(terms[i].term)
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
Teeft.prototype.compare = function(a, b) {
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
Teeft.prototype.index = function(data, options) {
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
    },
    sort = options && options.sort,
    truncate = options && options.truncate;
  // Get tokens
  text.tokens = this.tokenize(data);
  // If there is no token, end of process
  if (text.tokens.length === 0) return text;
  // Tag des tokens
  text.terms.tagged = this.tagger.tag(text.tokens);
  // If there is no tagged term, end of process
  if (text.terms.tagged.length === 0) return text;
  // Lemmatize tagged terms
  text.terms.lemmatized = this.lemmatize(text.terms.tagged);
  // If there is no lemmatized term, end of process
  if (text.terms.lemmatized.length === 0) return text;
  // Sanitize all lemmatized terms
  text.terms.sanitized = this.sanitize(text.terms.lemmatized);
  // If there is no sanitized term, end of process
  if (text.terms.sanitized.length === 0) return text;
  // Extract terms
  text.extraction.terms = this.extractor.extract(text.terms.sanitized);
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
    const weighting = this.dictionary[key] || dValue;
    // Specificity = (frequency / totalFrequency) / (weighting)
    text.extraction.terms[key].specificity = ((text.extraction.terms[key].frequency / text.statistics.frequencies.total) / weighting);
    // Probability = (frequency / totalFrequency)
    text.extraction.terms[key].probability = (text.extraction.terms[key].frequency / text.statistics.frequencies.total);
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
    if (!truncate || (text.extraction.terms[key].specificity >= text.statistics.specificities.avg)) {
      text.extraction.terms[key].term = key;
      text.keywords.push(text.extraction.terms[key]);
    }
  }
  // If result need to be sorted
  if (sort) {
    text.keywords = text.keywords.sort(this.compare);
  }
  return text;
};

module.exports = Teeft;