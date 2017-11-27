/* global module */
/* jslint node: true */
/* jslint indent: 2 */
("use strict");

/* Module Require */
let math = require("mathjs");

/**
 * Constructor
 * @param {Object} options Options of constructor
 * @return this
 */
let Matrix = function(options) {
  // Default values
  const DEFAULT = {
    "boost": 50
  };
  this.boost = (options && options.boost) ? options.boost : DEFAULT.boost;
  return this;
};

Matrix.SelectCriterion = "frequency";


/**
 * Init each values of this object
 * @param {Array} indexations Array filled with indexations of each segments
 * @param {Array} selectors Array filled with each segment's name
 * @return {undefied} Return undefied
 */
Matrix.prototype.init = function(indexations, selectors) {
  // reference to this
  const self = this;
  self.mapping = {}; // Mapping of data
  self.terms = {}; // List of terms
  self.segments = {}; // List des segments
  self.matrices = {}; // List of matrices
  self.selectors = selectors; // List of selectors
  self.indexations = indexations; // List of indexations
  self.selectors.segments.map(function(el, i) {
    if (!self.segments.hasOwnProperty(el)) {
      self.segments[el] = Object.keys(self.segments).length;
    }
    self.mapping[self.segments[el]] = {};
  });
  self.indexations.map(function(el, i) {
    if (!self.terms.hasOwnProperty(el.term)) {
      self.terms[el.term] = Object.keys(self.terms).length;
    }
    self.mapping[self.segments[el.segment]][self.terms[el.term]] = el;
  });
};

/**
 * Fill a matrix with values of choosen criterion
 * @param {string} criterion Key of term object
 * @return {Matrix} Return a mathsjs matrix filled with values (and )
 */
Matrix.prototype.fill = function(criterion) {
  // reference to this
  const self = this;
  // Return the existing matrix
  if (self.matrices[criterion]) {
    return self.matrices[criterion];
  }
  let m = math.zeros(self.selectors.segments.length + 1, Object.keys(self.terms).length + 1),
    size = m.size(),
    segSize = size[0],
    termSize = size[1];
  // Fill the matrix with values of indexation
  self.indexations.map(function(el, i) {
    m.set([self.segments[el.segment], self.terms[el.term]], (el[criterion]) ? el[criterion] : m.get([self.segments[el.segment], self.terms[el.term]]));
    m.set([self.segments[el.segment], termSize - 1], m.get([self.segments[el.segment], termSize - 1]) + m.get([self.segments[el.segment], self.terms[el.term]]));
    m.set([segSize - 1, self.terms[el.term]], m.get([segSize - 1, self.terms[el.term]]) + m.get([self.segments[el.segment], self.terms[el.term]]));
  });
  // Save the result
  self.matrices[criterion] = m;
  return m;
};

/**
 * Calcul some statistics
 * @param {Matrix} m Matrix (mathjs.matrix())
 * @return {Object} Return an object with some statistcs :
 *   - FR (rappel d’étiquetage),
 *   - FP (précision d’étiquetage),
 *   - FF (F-mesure d’étiquetage),
 *   - rowsFF (nb of terms for each rows of FF matrix),
 *   - colsFF (nb of terms for each columns of FF matrix),
 *   - mFF (mean of FF)
 */
Matrix.prototype.stats = function(m) {
  let size = m.size(),
    segSize = size[0],
    termSize = size[1],
    FR = math.zeros(segSize, termSize),
    FP = math.zeros(segSize, termSize),
    FF = math.zeros(segSize, termSize),
    rowsFF = new Array(termSize - 1).fill(0),
    colsFF = new Array(segSize - 1).fill(0),
    mFF = {
      value: 0,
      occurence: 0,
      mean: 0
    };
  // Calcul du rappel d’étiquetage (FR), de la précision d’étiquetage (FP) et de la F-mesure d’étiquetage (FF)
  for (var i = 0; i < segSize - 1; i++) {
    for (var j = 0; j < termSize - 1; j++) {
      let a = m.get([segSize - 1, j]),
        b = m.get([i, termSize - 1]),
        fr = a !== 0 ? m.get([i, j]) / a : 0,
        fp = b !== 0 ? m.get([i, j]) / b : 0,
        ff = fr && fp ? 2 * (fr * fp) / (fr + fp) : 0;
      if (fr) {
        FR.set([i, termSize - 1], FR.get([i, termSize - 1]) + fr);
        FR.set([segSize - 1, j], FR.get([segSize - 1, j]) + fr);
        FR.set([i, j], fr);
      }
      if (fp) {
        FP.set([i, termSize - 1], FP.get([i, termSize - 1]) + fp);
        FP.set([segSize - 1, j], FP.get([segSize - 1, j]) + fp);
        FP.set([i, j], fp);
      }
      if (ff) {
        rowsFF[j]++;
        colsFF[i]++;
        FF.set([i, termSize - 1], FF.get([i, termSize - 1]) + ff);
        FF.set([segSize - 1, j], FF.get([segSize - 1, j]) + ff);
        FF.set([i, j], ff);
      }
    }
  }
  // Calcul des moyennes rappel d’étiquetage (FR), de la précision d’étiquetage (FP) et de la F-mesure d’étiquetage (FF)
  for (var i = 0; i < segSize - 1; i++) {
    let value = FF.get([i, termSize - 1]) / colsFF[i];
    FF.set([i, termSize - 1], value);
    mFF.value += value;
    mFF.occurence++;
  }
  // Calcul des moyennes rappel d’étiquetage (FR), de la précision d’étiquetage (FP) et de la F-mesure d’étiquetage (FF)
  for (var i = 0; i < termSize - 1; i++) {
    let value = FF.get([segSize - 1, i]) / rowsFF[i];
    FF.set([segSize - 1, i], value);
    mFF.value += value;
    mFF.occurence++;
  }
  // Calul de la moyenne
  mFF.mean = mFF.value / mFF.occurence;
  return {
    FR,
    FP,
    FF,
    rowsFF,
    colsFF,
    mFF
  };
};

/**
 * -----
 * @param {Object} stats Statistics of Text (result of Matrix.stats())
 * @param {Object} boost List of boosted terms (Object with key = term)
 * @param {String} criterion Criterion used by skeeft (frequency or specificity)
 * @return {Object} Return an object with selected terms
 */
Matrix.prototype.select = function(stats, boost = {}, criterion = Matrix.SelectCriterion) {
  let result = {},
    size = stats.FF.size(),
    segSize = size[0],
    termSize = size[1];
  // Selection of variable
  for (var i = 0; i < segSize - 1; i++) {
    for (var j = 0; j < termSize - 1; j++) {
      let term = this.mapping[i][j];
      if (term) {
        let value = stats.FF.get([i, j]);
        if (value >= stats.mFF.mean || boost[term.term]) {
          if (!result[term.term]) {
            result[term.term] = {
              "strength": term.strength,
              "term": term.term,
              "segments": [],
              "factor": 0,
              "stats": {
                "sum": 0,
                "boost": 0,
              }
            };
            result[term.term][criterion] = term[criterion];
            result[term.term].stats[criterion] = 0;
          }
          result[term.term].segments.push(term.segment);
          result[term.term][criterion] += term[criterion];
          result[term.term].stats.sum += (value / stats.FF.get([i, termSize - 1]));
          if (boost[term.term]) result[term.term].stats.boost = (result[term.term].stats.boost === 0) ? this.boost : result[term.term].stats.boost;
          result[term.term].stats[criterion] += 1;
        }
      }
    }
  }
  // Calculate the factor of each result
  Object.keys(result).forEach(function(key) {
    result[key].factor = (result[key].stats.sum / result[key].stats[criterion]) + (result[key].stats.boost * result[key].stats[criterion] * result[key].strength);
  });
  return result;
};

/**
 * Sort all terms with the 'compare' function
 * @param {Object} terms List of terms
 * @param {Function} compare Compare function
 * @return {Array} Return the array of sorted terms
 */
Matrix.prototype.sort = function(terms, compare = Matrix.compare) {
  let result = [];
  // Transform object in array
  for (var k in terms) {
    result.push(terms[k]);
  }
  return result.sort(compare);
};

/**
 * Compare two elements depending of its factor
 * @param {Object} a First object
 * @param {Object} b Second object
 * @return {Integer} return 1, -1 or 0
 */
Matrix.compare = function(a, b) {
  if (a.factor > b.factor) return -1;
  else if (a.factor < b.factor) return 1;
  else return 0;
};

module.exports = Matrix;