/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

const Tagger = function(lexicon) {

  // this reference
  const self = this;

  self.lexicon = Object.create(null, {});

  // Set all keys
  for (let keys in lexicon) {
    self.lexicon[keys] = lexicon[keys];
  }

  /**
   * Tag terms
   * @param {Array} terms List of terms
   * @return {Array} List of tagged terms
   */
  self.tag = function(terms) {
    let result = [];
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i],
        tag = (self.lexicon[term]) ? self.lexicon[term] : 'NND';
      result.push({
        term: term,
        tag: tag
      });
    }
    return result;
  };

  return self;
};

module.exports = Tagger;