/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

const pkg = require('../package.json'),
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
const tagger = new Tagger(lexicon),
  filter = new DefaultFilter(),
  extractor = new TermExtraction({
    'filter': filter
  }),
  lemmatizer = new Lemmatizer();

// Test dataset for each tested function
const data = require('./dataset/in/data.json'),
  originalConfigTest = require("./dataset/in/sisyphe-conf.json"),
  datasets = {
    'worker': require('./dataset/in/test.worker.json'),
    'tagger': require('./dataset/in/test.tagger.json'),
    'filter': require('./dataset/in/test.filter.json'),
    'extractor': require('./dataset/in/test.extractor.json')
  };

// Wrappers used for each tested function
const wrappers = {
  'worker': {
    'doTheJob': testOf_doTheJob,
    'load': testOf_load,
    'index': testOf_index,
    'tokenize': null,
    'translateTag': testOf_translateTag,
    'sanitize': testOf_sanitize,
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

// Tested object (only functions are "automatically" tested)
const objects = {
  'worker': worker,
  'tagger': tagger,
  'filter': filter,
  'extractor': extractor
};

// Call of init function (shoulb be done by sisyphe usually)
worker.init({
  "outputPath": "test/dataset/out",
  "config": JSON.parse(JSON.stringify(originalConfigTest)),
  "sharedConfigDir": "test/dataset/in/shared"
});

/**
 * Test of functions of :
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
 * Wrapper of :
 * - worker.doTheJob()
 */
function testOf_doTheJob(fn, item, cb) {
  const docObject = data[item.key];
  return fn(docObject, function(err, res) {
    item.result.include = worker.LOGS[item.key]; // will contain the expected value
    const value = res[pkg.name][item.logs][res[pkg.name][item.logs].length - 1]; // will contain the returned value
    return cb(value);
  });
}

/**
 * Wrapper of :
 * - worker.index()
 */
function testOf_index(fn, item, cb) {
  fs.readFile(item.arguments.path, 'utf-8', function(err, res) {
    if (err) throw err;
    const result = fn(res);
    return cb(result.keywords);
  });
}

/**
 * Wrapper of :
 * - worker.load()
 */
function testOf_load(fn, item, cb) {
  item.arguments.options.config = (item.arguments.options.config) ? JSON.parse(JSON.stringify(originalConfigTest)) : {}; // If we need a config in this test, we will use the configTest
  const value = fn(item.arguments.options);
  return cb(Object.keys(value.stopwords));
}

/**
 * Wrapper of :
 * - worker.translateTag()
 */
function testOf_translateTag(fn, item, cb) {
  // Get all tags in lexicon
  const tags = {};
  for (let key in lexicon) {
    tags[lexicon[key]] = true;
  }
  // Get all possible results with available tag in lexicon
  const results = {};
  for (let key in tags) {
    results[fn(key)] = true;
  }
  return cb(Object.keys(results));
}

/**
 * Wrapper of :
 * - worker.sanitize()
 */
function testOf_sanitize(fn, item, cb) {
  const value = fn(item.arguments),
    invalid = worker.tagger.tag(worker.SEPARATOR)[0],
    result = value.reduce(function(sum, current) {
      if (current.tag === invalid.tag) {
        return sum + 1;
      } else {
        return sum;
      }
    }, 0);
  return cb(result);
}

/**
 * Wrapper of :
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
 * Wrapper of :
 * - filter.call()
 */
function testOf_call(fn, item, cb) {
  return cb(fn(item.arguments.occur, item.arguments.length));
}

/**
 * Wrapper of :
 * - filter.extract()
 */
function testOf_extract(fn, item, cb) {
  const result = Object.keys(fn(item.arguments));
  return cb(result);
}