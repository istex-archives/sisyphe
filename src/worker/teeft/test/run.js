/* global __dirname, require, process, it */
'use strict';

let pkg = require('../package.json'),
  worker = require('../index.js'),
  Tagger = require('../lib/tagger.js'),
  lexicon = require('../lib/lexicon.js'),
  DefaultFilter = require('../lib/defaultfilter.js'),
  TermExtraction = require('../lib/termextractor.js'),
  fs = require('fs'),
  Lemmatizer = require('javascript-lemmatizer'),
  async = require('async'),
  TU = require('auto-tu');

// Tagger + filter + extractor + lemmatizer
let tagger = new Tagger(lexicon),
  filter = new DefaultFilter(),
  extractor = new TermExtraction({
    'filter': filter
  }),
  lemmatizer = new Lemmatizer();

// Données de test
let data = require('./dataset/in/data.json'),
  datasets = {
    'worker': require('./dataset/in/test.worker.json'),
    'tagger': require('./dataset/in/test.tagger.json'),
    'filter': require('./dataset/in/test.filter.json'),
    'extractor': require('./dataset/in/test.extractor.json')
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
let wrappers = {
  'worker': {
    'doTheJob': testOf_doTheJob,
    'index': testOf_index,
    'tokenize': null,
    'translateTag': testOf_translateTag,
    'sanitize': null,
    'lemmatize': null
  },
  'tagger': {
    'tag': null
  },
  'filter': {
    'configure': testOf_configure,
    'call': testOf_call
  },
  'extractor': {
    'extract': testOf_extract
  }
};

let objects = {
  'worker': worker,
  'tagger': tagger,
  'filter': filter,
  'extractor': extractor
};

worker.init({
  "outputPath": "./test/dataset/out/"
});

/**
 * Test des fonctions de :
 *   - worker :
 *     - doTheJob()
 *     - tokenize()
 *     - translateTag()
 *     - sanitize()
 *     - lemmatize()
 *   - tagger : 
 *     - tag()
 *   - filer :
 *     - configure()
 *   - extractor :
 *     - extract()
 */
// Pour chaque clé
async.eachSeries(Object.keys(datasets), function(key, callback) {
  TU.start({
    description: pkg.name + '/index.js',
    root: key,
    object: objects[key],
    dataset: datasets[key],
    wrapper: wrappers[key]
  });
  return callback();
});

/**
 * Fonction de test à appliquée pour :
 * - worker.doTheJob()
 */
function testOf_doTheJob(fn, item, cb) {
  let docObject = data[item.key];
  return fn(docObject, function(err, res) {
    item.result.include = worker.LOGS[item.key]; // Contiendra la valeur de l'erreur attendu
    let value = res[pkg.name][item.logs][res[pkg.name][item.logs].length - 1]; // Contiendra la valeur renvoyer par le module
    return cb(value);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - worker.index()
 */
function testOf_index(fn, item, cb) {
  fs.readFile(item.arguments.path, 'utf-8', function(err, res) {
    if (err) throw err;
    let result = fn(res);
    return cb(result.keywords);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - worker.translateTag()
 */
function testOf_translateTag(fn, item, cb) {
  // Récupération de tous les tags présents dans le lexicon
  let tags = {};
  for (let key in lexicon) {
    tags[lexicon[key]] = true;
  }
  // Récupération de tous les résultats possibles avec les tags présents dans le lexicon
  let results = {};
  for (let key in tags) {
    results[fn(key)] = true;
  }
  return cb(Object.keys(results));
}

/**
 * Fonction de test à appliquée pour :
 * - filter.configure()
 */
function testOf_configure(fn, item, cb) {
  let result = true;
  for (let i = 0; i < item.arguments.length; i++) {
    result = result && (fn(item.arguments[i]) === item.values[i]);
  }
  return cb(result);
}

/**
 * Fonction de test à appliquée pour :
 * - filter.call()
 */
function testOf_call(fn, item, cb) {
  return cb(fn(item.arguments.occur, item.arguments.length));
}

/**
 * Fonction de test à appliquée pour :
 * - filter.extract()
 */
function testOf_extract(fn, item, cb) {
  let result = Object.keys(fn(item.arguments));
  return cb(result);
}