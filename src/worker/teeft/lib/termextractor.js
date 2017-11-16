/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

const extend = require('util')._extend,
  Tagger = require('./tagger.js'),
  DefaultFilter = require('./defaultfilter.js');

const TermExtractor = function(options) {

  // this reference
  const self = this;

  self.SEARCH = 0;
  self.NOUN = 1;
  self.tagger = (options && options.tagger) ? options.tagger : new Tagger();
  self.filter = (options && options.filter) ? options.filter : new DefaultFilter();

  self.call = function(text) {
    const terms = self.tagger.call(text);
    return self.extract(terms);
  };

  self.extract = function(taggedTerms) {
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
      cp = extend([], taggedTerms);

    //# Phase 1: A little state machine is used to build simple and
    //# composite terms.
    let multiterm = [],
      state = self.SEARCH,
      word;

    while (cp.length > 0) {
      let tagged_term = cp.shift(),
        term = tagged_term.term,
        tag = tagged_term.tag,
        norm = tagged_term.lemma,
        startsWithN = self._startsWith(tag, 'N'),
        startsWithJ = self._startsWith(tag, 'J');

      if (state == self.SEARCH && (startsWithN || startsWithJ)) {
        state = self.NOUN;
        multiterm.push(norm);
        terms._add(norm);
      } else if (state == self.NOUN && (startsWithN || startsWithJ)) {
        multiterm.push(norm);
        terms._add(norm);
      } else if (state == self.NOUN && !startsWithN && !startsWithJ) {
        state = self.SEARCH;
        if (multiterm.length > 1) {
          word = multiterm.join(' ');
          terms._add(word);
        }
        multiterm = [];
      }
    }

    // If a multiterm was in progress, we save it
    if (multiterm.length > 1) {
      word = multiterm.join(' ');
      terms._add(word);
    }

    //# Phase 2: Only select the terms that fulfill the filter criteria.
    //# Also create the term strength.
    let result = {};
    delete terms._add;
    for (word in terms) {
      const occur = terms[word].frequency,
        strength = word.split(" ").length;
      if (self.filter.call(occur, strength)) {
        result[word] = {
          frequency: occur,
          strength: strength
        };
      }
    }
    return result;
  };

  self._startsWith = function(str, prefix) {
    return str.substring(0, prefix.length) === prefix;
  };

  return self;
};

module.exports = TermExtractor;