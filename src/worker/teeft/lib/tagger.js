/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

const Tagger = function(lexicon) {

  // référence à this
  const self = this;

  self.lexicon = Object.create(null, {});

  // Suppression des clés "réservées"
  for (let keys in lexicon) {
    self.lexicon[keys] = lexicon[keys];
  }

  /**
   * Tag les termes
   * @param {Array} terms Liste de termes
   * @return {Array} Liste des termes nettoyés
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