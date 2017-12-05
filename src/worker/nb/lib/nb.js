/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const fs = require("fs");

/**
 * Constructor
 * @param {Boolean} lower Define if toLowerCase function is applied
 * @return this
 */
const Tokenizer = function(lower) {
  const re = new RegExp("\\w+", "gm");
  this.lower = lower || false;
  this.tokenize = function(str) {
    if (lower) {
      str = str.toLowerCase();
    }
    return str.match(re);
  };
  return this;
};

/**
 * Constructor
 * @param {String} name Name of BayesData
 * @param {Object} pool Pool of BayesData
 * @return this
 */
const BayesData = function(name, pool) {
  this.name = name || "";
  this.training = [];
  this.pool = pool || {};
  this.tokenCount = 0;
  this.trainCount = 0;
  return this;
};

/**
 * Constructor
 * @param {Object} options All options
 *   {Number} min Minimum limit of guess probability
 *   {Boolean} lower Define if toLowerCase function is applied
 *   {Boolean} lower Define if toLowerCase function is applied
 * @return this
 */
const Bayes = function(options) {
  // Default values
  const DEFAULT = {
      "lower": false,
      "dataClass": BayesData,
      "pools": {},
      "minProbability": 0,
      "combiner": Bayes.robinson
    },
    lowerCase = (options && options.lower) ? options.lower : DEFAULT.lower;
  this.dataClass = (options && options.dataClass) ? options.dataClass : DEFAULT.dataClass;
  this.pools = (options && options.pool) ? options.pool : DEFAULT.pools;
  this.minProbability = (options && options.minProbability) ? options.minProbability : DEFAULT.minProbability;
  this.combiner = (options && options.combiner) ? options.combiner : DEFAULT.combiner;
  this.defaultKey = "__Corpus__";
  this.pools[this.defaultKey] = new this.dataClass(this.defaultKey);
  this.trainCount = 0;
  this.dirty = true;
  this._tokenizer = new Tokenizer(lowerCase);
  return this;
};

/**
 * Calcul of probabilities (Robinson methodology)
 * P = 1 - prod(1 - p) ^ (1 / n)
 * Q = 1 - prod(p) ^ (1 / n)
 * S = (1 + (P - Q) / (P + Q)) / 2
 * @param {Array} probs List of probabilities
 * @return S
 */
Bayes.robinson = function(probs) {
  const nth = 1 / probs.length,
    _p = probs.reduce(function(pValue, cValue, i, array) {
      return pValue * (1 - cValue[1]);
    }, 1),
    p = Math.pow(_p, nth),
    P = 1 - p,
    _q = probs.slice(1).reduce(function(pValue, cValue, i, array) {
      return pValue * cValue[1];
    }, probs[0][1]),
    q = Math.pow(_q, nth),
    Q = 1 - q,
    S = (P - Q) / (P + Q);
  return (1 + S) / 2;
};

/**
 * Save data
 * @param {String} path Path of file
 * @param {Function} callback Callback
 * @return undefined
 */
Bayes.prototype.save = function(path, callback) {
  if (this.dirty) {
    this.buildCache();
    this.dirty = false;
  }
  const data = JSON.stringify(this.cache);
  fs.writeFile(path, data, function(err) {
    if (callback) {
      callback(err);
    }
  });
};

/**
 * Load data
 * @param {Object} data Data loaded
 * @return undefined
 */
Bayes.prototype.load = function(data) {
  this.cache = data;
  this.dirty = false;
};

/**
 * Train Bayesian
 * @param {String} pool Name of pool
 * @param {String} item Text
 * @param {String} uid Id of text
 * @return undefined
 */
Bayes.prototype.train = function(pool, item, uid) {
  const tokens = this.getTokens(item);
  if (!this.pools[pool]) {
    this.pools[pool] = new this.dataClass(pool);
  }
  this._train(this.pools[pool], tokens);
  this.corpus.trainCount += 1;
  this.pools[pool].trainCount += 1;
  if (uid) {
    this.pools[pool].training.append(uid);
  }
  this.dirty = true;
};

/**
 * Call Tokenizer to get tokens
 * @param {String} obj Text to tokenize
 * @return Return list of tokens
 */
Bayes.prototype.getTokens = function(obj) {
  return this._tokenizer.tokenize(obj);
};

/**
 * Train Bayesian
 * @param {String} pool Name of pool
 * @param {Array} tokens List of tokens
 * @return unefined
 */
Bayes.prototype._train = function(pool, tokens) {
  let wc = 0;
  for (let token in tokens) {
    let count = pool.pool[tokens[token]] || 0;
    pool.pool[tokens[token]] = count + 1;
    count = this.corpus.pool[tokens[token]] || 0;
    this.corpus.pool[tokens[token]] = count + 1;
    wc++;
  }
  pool.tokenCount += wc;
  this.corpus.tokenCount += wc;
};

/**
 * Guess form trainings
 * @param {String} msg Text to guess
 * @return Return result with informations (category + probability + probabilities)
 */
Bayes.prototype.guess = function(msg) {
  const tokens = this.getTokens(msg),
    pools = this.poolProbs();
  let probabilities = {},
    probability = this.minProbability,
    category = undefined;
  for (let k in pools) {
    const p = this.getProbs(pools[k].pool, tokens);
    if (Object.keys(p).length != 0) {
      probabilities[k] = this.combiner(p, k);
      if (probabilities[k] > probability) {
        probability = probabilities[k];
        category = k;
      }
    }
  }
  return {
    "category": category,
    "probability": probability,
    "probabilities": probabilities
  };
};

/**
 * Calculate pool probabilities
 * @return Return cached pool probabilities
 */
Bayes.prototype.poolProbs = function() {
  if (this.dirty) {
    this.buildCache();
    this.dirty = false;
  }
  return this.cache;
};

/**
 * Build cache of pools
 * @return undefined
 */
Bayes.prototype.buildCache = function() {
  this.cache = {};
  for (let k in this.pools) {
    if (k == this.defaultKey) {
      continue;
    }
    const poolCount = this.pools[k].tokenCount,
      themCount = Math.max(this.corpus.tokenCount - poolCount, 1);
    this.cache[k] = new this.dataClass(k);
    for (let word in this.corpus.pool) {
      const thisCount = this.pools[k].pool[word];
      if (thisCount == 0.0) {
        continue;
      }
      const otherCount = this.corpus.pool[word] - thisCount;
      let goodMetric;
      if (poolCount) {
        goodMetric = Math.min(1.0, otherCount / poolCount);
      } else {
        goodMetric = 1.0;
      }
      const badMetric = Math.min(1.0, thisCount / themCount);
      const f = badMetric / (goodMetric + badMetric);
      if (Math.abs(f - 0.5) >= 0.1) {
        this.cache[k].pool[word] = Math.max(0.0001, Math.min(0.9999, f));
      }
    }
  }
};

/**
 * Get probabilities of words
 * @param {Object} pool Pool of probabilities
 * @param {Object} words Words
 * @return Return probabilities
 */
Bayes.prototype.getProbs = function(pool, words) {
  const probs = [];
  for (let k in words) {
    if (pool[words[k]]) {
      probs.push([words[k], pool[words[k]]]);
    }
  }
  probs.sort(function(x, y) {
    return (y[1] > x[1]) ? 1 : ((x[1] > y[1]) ? -1 : 0);
  });
  if (probs.length > 2048) {
    probs = probs.slice(0, 2048);
  }
  return probs;
};

/**
 * Multiply 2 Number betwen them
 * @param {Number} a A Number
 * @param {Number} b An other Number
 * @return Return the result of multiplication
 */
Bayes.prototype.multiply = function(a, b) {
  return a * b;
};

module.exports = Bayes;