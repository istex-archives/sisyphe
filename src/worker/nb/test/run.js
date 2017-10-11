/* global __dirname, require, process, it */

'use strict';

var pkg = require('../package.json'),
  business = require('../index.js'),
  fs = require('fs'),
  async = require('async'),
  TU = require('auto-tu');

// Données de test
var data = require('./dataset/in/data.json'),
  datasets = {
    'business': require('./dataset/in/test.business.json')
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
var wrappers = {
  'business': {
    'doTheJob': testOf_doTheJob,
    'categorize': testOf_categorize
  }
};

var objects = {
  'business': business
};

business.init();

/**
 * Test des fonctions de :
 *   - business :
 *     - doTheJob()
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
 * - business.doTheJob()
 */
function testOf_doTheJob(fn, item, cb) {
  return fn(data[item.key], function(err, res) {
    item.result.include = business.LOGS[item.key]; // Contiendra la valeur de l'erreur attendu
    var value = res[pkg.name][item.logs][res[pkg.name][item.logs].length - 1]; // Contiendra la valeur renvoyer par le module
    return cb(value);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - business.categorize()
 */
function testOf_categorize(fn, item, cb) {
  fs.readFile(item.arguments.path, 'utf-8',
    function(err, res) {
      if (err) throw err;
      cb(fn(res).categories);
    });
}