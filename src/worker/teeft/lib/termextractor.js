/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

const _ = require("lodash"),
  Tagger = require("./tagger.js"),
  DefaultFilter = require("./defaultfilter.js");

/**
 * Constructor
 * @param {Object} options Options : tagger + filter
 * @return this
 */
const TermExtractor = function(options) {
  this.SEARCH = 0;
  this.NOUN = 1;
  this.tagger = (options && options.tagger) ? options.tagger : new Tagger();
  this.filter = (options && options.filter) ? options.filter : new DefaultFilter();
  return this;
};

/**
 * Tag terms
 * @param {Array} taggedTerms List of tagged terms
 * @return {Object} Return all extracted terms
 */
TermExtractor.prototype.extract = function(taggedTerms) {
  const terms = {
      _add: function(norm) {
        if (!this[norm]) {
          this[norm] = {
            frequency: 0
          };
        }
        this[norm].frequency++;
      }
    },
    cp = _.cloneDeep(taggedTerms);
  // Configure the filter
  this.filter.configure(taggedTerms.length);
  //# Phase 1: A little state machine is used to build simple and
  //# composite terms.
  let multiterm = [],
    state = this.SEARCH,
    word;
  while (cp.length > 0) {
    let tagged_term = cp.shift(),
      term = tagged_term.term,
      tag = tagged_term.tag,
      norm = tagged_term.lemma,
      startsWithN = this._startsWith(tag, "N"),
      startsWithJ = this._startsWith(tag, "J");
    if (state == this.SEARCH && (startsWithN || startsWithJ)) {
      state = this.NOUN;
      multiterm.push(norm);
      terms._add(norm);
    } else if (state == this.NOUN && (startsWithN || startsWithJ)) {
      multiterm.push(norm);
      terms._add(norm);
    } else if (state == this.NOUN && !startsWithN && !startsWithJ) {
      state = this.SEARCH;
      if (multiterm.length > 1) {
        word = multiterm.join(" ");
        terms._add(word);
      }
      multiterm = [];
    }
  }
  // If a multiterm was in progress, we save it
  if (multiterm.length > 1) {
    word = multiterm.join(" ");
    terms._add(word);
  }
  //# Phase 2: Only select the terms that fulfill the filter criteria.
  //# Also create the term strength.
  let result = {};
  delete terms._add;
  for (word in terms) {
    const occur = terms[word].frequency,
      strength = word.split(" ").length;
    if (this.filter.call(occur, strength)) {
      result[word] = {
        frequency: occur,
        strength: strength
      };
    }
  }
  return result;
};

/**
 * Tag terms
 * @param {String} str String where the prefix will be searched
 * @param {String} prefix Prefix used for the research
 * @return {Boolean} Return true if the prefix of the string is correct, else false
 */
TermExtractor.prototype._startsWith = function(str, prefix) {
  return str.substring(0, prefix.length) === prefix;
};

module.exports = TermExtractor;