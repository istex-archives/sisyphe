/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  Matrix = require("./matrix.js"),
  Teeft = require("../../teeft/lib/teeft.js");

/**
 * Constructor
 * @param {Object} options Options of constructor
 * @return this
 */
const Skeeft = function(options) {
  // Default values
  const DEFAULT = {
    "filters": {
      "title": null,
      "fulltext": null
    }
  };
  this.teeft = {
    "title": new Teeft({
      "filter": (options && options.filters && options.filters.title) ? options.filters.title : DEFAULT.filters.title
    }),
    "fulltext": new Teeft({
      "filter": (options && options.filters && options.filters.fulltext) ? options.filters.fulltext : DEFAULT.filters.fulltext
    })
  };
  this.filters = {
    "title": this.teeft.title.extractor.filter,
    "fulltext": this.teeft.fulltext.extractor.filter
  }
  return this;
};

/**
 * Index a fulltext (called by sisyphe)
 * @param {String} xmlString Fulltext (XML formated string)
 * @param {Object} selectors Used selectors
 * @param {String} criterion Criterion used (sort)
 * @return {Array} List of extracted keywords
 */
Skeeft.prototype.index = function(xmlString, selectors, criterion) {
  // reference to this
  const self = this,
    $ = utils.XML.load(xmlString),
    _selectors = {
      "title": selectors.title,
      "segments": {}
    },
    titleWords = self.teeft.title.index($(selectors.title).text(), {
      "truncate": false,
      "sort": false
    }).extraction.terms, // Get keywords in title (weighting)
    indexations = selectors.segments.map(function(el, i) {
      return $(el).map(function(j, e) {
        return self.teeft.fulltext.index($(e).text(), {
          "truncate": false,
          "sort": false
        });
      }).get();
    }), // Get keywords for each parts of fulltext
    data = indexations.map(function(e, i) {
      return e.map(function(f, j) {
        return f.keywords.map(function(g, k) {
          const key = selectors.segments[i] + ((e.length > 1) ? ":nth-child(" + (j + 1) + ")" : ""), // If there is more than one element, create an unique selector
            cp = Object.assign({
              segment: key
            }, g);
          _selectors.segments[key] = true;
          return cp;
        });
      }).reduce(function(acc, cur) {
        return acc.concat(cur);
      }, []);
    }).reduce(function(acc, cur) {
      return acc.concat(cur);
    }, []), // Regroup keywords
    m = new Matrix(); // Matrix of text representation
  _selectors.segments = Object.keys(_selectors.segments);
  m.init(data, _selectors);
  const filled = m.fill(criterion),
    stats = m.stats(filled),
    select = m.select(stats, titleWords),
    sorted = m.sort(select);
  return sorted
};

module.exports = Skeeft;