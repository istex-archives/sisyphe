/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

let Backbone = require('backbone'),
  extend = require('util')._extend;

module.exports = Backbone.Model.extend({
  SEARCH: 0,
  NOUN: 1,

  defaults: {
    tagger: null,
    filter: null,
  },

  initialize: function() {

  },

  call: function(text) {
    let terms = this.get('tagger').call(text);
    return this.extract(terms);
  },

  extract: function(taggedTerms) {
    let terms = {
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
      state = this.SEARCH,
      word;

    while (cp.length > 0) {
      let tagged_term = cp.shift(),
        term = tagged_term.term,
        tag = tagged_term.tag,
        norm = tagged_term.lemma,
        startsWithN = this._startsWith(tag, 'N'),
        startsWithJ = this._startsWith(tag, 'J');

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
      let occur = terms[word].frequency,
        strength = word.split(" ").length;
      if (this.get('filter').call(occur, strength)) {
        result[word] = {
          frequency: occur,
          strength: strength
        };
      }
    }
    return result;
  },

  _startsWith: function(str, prefix) {
    return str.substring(0, prefix.length) === prefix;
  }

});