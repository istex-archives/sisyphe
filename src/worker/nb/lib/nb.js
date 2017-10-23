/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

/* Module Require */
const fs = require('fs');

/* Exported objects */

/* Tokenizer */
const Tokenizer = function(lower) {
  const self = this,
    re = new RegExp('\\w+', 'gm');

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
const BayesData = function(name, pool) {

  const self = this;

  self.name = name || '';
  self.training = [];
  self.pool = pool || {};
  self.tokenCount = 0;
  self.trainCount = 0;

  return self;
};

/* Bayes */
const Bayes = function(min, lower = false) {

  const self = this;
  /*
   * calcule la probabilité (méthode Robinson)
   * P = 1 - prod(1 - p) ^ (1 / n)
   * Q = 1 - prod(p) ^ (1 / n)
   * S = (1 + (P - Q) / (P + Q)) / 2
   */
  self.robinson = function(probs) {
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
  }

  self.dataClass = BayesData;
  self.corpus = new self.dataClass('__Corpus__');
  self.pools = {};
  self.pools['__Corpus__'] = self.corpus;
  self.trainCount = 0;
  self.dirty = true;
  self.minProbability = min || 0;
  self._tokenizer = new Tokenizer(lower);
  self.combiner = self.robinson;

  self.save = function(path, callback) {
    if (self.dirty) {
      self.buildCache();
      self.dirty = false;
    }
    const data = JSON.stringify(self.cache);
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
    const tokens = self.getTokens(item);
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
    let wc = 0;
    for (let token in tokens) {
      let count = pool.pool[tokens[token]] || 0;
      pool.pool[tokens[token]] = count + 1;
      count = self.corpus.pool[tokens[token]] || 0;
      self.corpus.pool[tokens[token]] = count + 1;
      wc++;
    }
    pool.tokenCount += wc;
    self.corpus.tokenCount += wc;
  };

  self.guess = function(msg) {
    const tokens = self.getTokens(msg),
      pools = self.poolProbs();
    let probabilities = {},
      probability = self.minProbability,
      category = undefined;
    for (let k in pools) {
      const p = self.getProbs(pools[k].pool, tokens);
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
    for (let k in self.pools) {
      if (k == '__Corpus__') {
        continue;
      }

      const poolCount = self.pools[k].tokenCount,
        themCount = Math.max(self.corpus.tokenCount - poolCount, 1);
      self.cache[k] = new self.dataClass(k);

      for (let word in self.corpus.pool) {
        // pour chaque mot du corpus verifie si le pool contient ce mot
        const thisCount = self.pools[k].pool[word];
        if (thisCount == 0.0) {
          continue;
        }
        const otherCount = self.corpus.pool[word] - thisCount;
        let goodMetric;

        if (poolCount) {
          goodMetric = Math.min(1.0, otherCount / poolCount);
        } else {
          goodMetric = 1.0;
        }
        const badMetric = Math.min(1.0, thisCount / themCount);
        const f = badMetric / (goodMetric + badMetric);

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
  }

  self.multiply = function(a, b) {
    return a * b;
  };

  return self;
};

module.exports = Bayes;