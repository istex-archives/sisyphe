/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

/* Module Require */
var fs = require('fs');

/* Exported objects */

/* Tokenizer */
var Tokenizer = function(lower) {

  // référence à this
  var self = this;

  var re = new RegExp('\\w+', 'gm');

  self.lower = lower || false;

  self.tokenize = function(str) {
    if (lower) {
      str = str.toLowerCase();
    }
    return str.match(re);
  };

  return self;
};

/* BayesData */
var BayesData = function(name, pool) {

  // référence à this
  var self = this;

  self.name = name || '';
  self.training = [];
  self.pool = pool || {};
  self.tokenCount = 0;
  self.trainCount = 0;

  return self;
};

/* Bayes */
var Bayes = function(min) {

  // référence à this
  var self = this;

  self.dataClass = BayesData;
  self.corpus = new self.dataClass('__Corpus__');
  self.pools = {};
  self.pools['__Corpus__'] = self.corpus;
  self.trainCount = 0;
  self.dirty = true;
  self.minProbability = min || 0;
  self._tokenizer = new Tokenizer();
  self.combiner = robinson;

  /*
   * calcule la probabilité (méthode Robinson)
   * P = 1 - prod(1 - p) ^ (1 / n)
   * Q = 1 - prod(p) ^ (1 / n)
   * S = (1 + (P - Q) / (P + Q)) / 2
   */
  function robinson(probs) {
    var nth = 1 / probs.length;
    var _p = probs.reduce(function(pValue, cValue, i, array) {
      return pValue * (1 - cValue[1]);
    }, 1);
    var p = Math.pow(_p, nth);
    var P = 1 - p;
    var _q = probs.slice(1).reduce(function(pValue, cValue, i, array) {
      return pValue * cValue[1];
    }, probs[0][1]);
    var q = Math.pow(_q, nth);
    var Q = 1 - q;
    var S = (P - Q) / (P + Q);
    return (1 + S) / 2;
  }

  self.save = function(path, callback) {
    if (self.dirty) {
      self.buildCache();
      self.dirty = false;
    }
    var data = JSON.stringify(self.cache);
    fs.writeFile(path, data, function(err) {
      if (callback) {
        callback(err);
      }
    });
  };

  self.load = function(data) {
    self.cache = data;
    self.dirty = false;
  };

  self.train = function(pool, item, uid) {
    var tokens = self.getTokens(item);
    if (!self.pools[pool]) {
      self.pools[pool] = new self.dataClass(pool);
    }
    self._train(self.pools[pool], tokens);
    self.corpus.trainCount += 1;
    self.pools[pool].trainCount += 1;
    if (uid) {
      self.pools[pool].training.append(uid);
    }
    self.dirty = true;
  };

  /*
   * Par defaut obj = decouper sur les espaces.
   * On ne change pas la casse
   * Dans certaines applications, il faudra peut - etre tout en minuscules
   */
  self.getTokens = function(obj) {
    return self._tokenizer.tokenize(obj);
  };

  self._train = function(pool, tokens) {
    var wc = 0;
    for (var token in tokens) {
      var count = pool.pool[tokens[token]] || 0;
      pool.pool[tokens[token]] = count + 1;
      count = self.corpus.pool[tokens[token]] || 0;
      self.corpus.pool[tokens[token]] = count + 1;
      wc++;
    }
    pool.tokenCount += wc;
    self.corpus.tokenCount += wc;
  };

  self.guess = function(msg) {
    var tokens = self.getTokens(msg),
      pools = self.poolProbs(),
      probabilities = {},
      probability = self.minProbability,
      category = undefined;
    for (var k in pools) {
      var p = self.getProbs(pools[k].pool, tokens);
      if (Object.keys(p).length != 0) {
        probabilities[k] = self.combiner(p, k);
        if (probabilities[k] > probability) {
          probability = probabilities[k];
          category = k;
        }
      }
    }
    return {
      'category': category,
      'probability': probability,
      'probabilities': probabilities
    };
  };

  self.poolProbs = function() {
    if (self.dirty) {
      self.buildCache();
      self.dirty = false;
    }
    return self.cache;
  };

  /*
   * fusionne corpus et calcule probas
   */
  self.buildCache = function() {

    self.cache = {};
    for (var k in self.pools) {
      if (k == '__Corpus__') {
        continue;
      }

      var poolCount = self.pools[k].tokenCount,
        themCount = Math.max(self.corpus.tokenCount - poolCount, 1);
      self.cache[k] = new self.dataClass(k);

      for (var word in self.corpus.pool) {
        // pour chaque mot du corpus verifie si le pool contient ce mot
        var thisCount = self.pools[k].pool[word];
        if (thisCount == 0.0) {
          continue;
        }
        var otherCount = self.corpus.pool[word] - thisCount;
        var goodMetric;

        if (poolCount) {
          goodMetric = Math.min(1.0, otherCount / poolCount);
        } else {
          goodMetric = 1.0;
        }
        var badMetric = Math.min(1.0, thisCount / themCount);
        var f = badMetric / (goodMetric + badMetric);

        // SEUIL PROBABILITE
        if (Math.abs(f - 0.5) >= 0.1) {
          // BONNE_PROB, MAUVAISE_PROB
          self.cache[k].pool[word] = Math.max(0.0001, Math.min(0.9999, f));
        }
      }
    }
  };

  /*
   * extrait les probabilités de tokens ds message
   */
  self.getProbs = function(pool, words) {
    var probs = [];
    for (var k in words) {
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
  }

  self.multiply = function(a, b) {
    return a * b;
  };

  return self;
};

module.exports = Bayes;