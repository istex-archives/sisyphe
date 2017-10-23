/* global __dirname, require, process, it */

'use strict';

const pkg = require('../package.json'),
  worker = require('../index.js'),
  async = require('async'),
  TU = require('auto-tu');

// Données de test
const data = require('./dataset/in/data.json'),
  datasets = {
    'worker': require('./dataset/in/test.worker.json')
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
const wrappers = {
  'worker': {
    'doTheJob': testOf_doTheJob,
    'categorize': testOf_categorize
  }
};

const objects = {
  'worker': worker
};

worker.init({
  "outputPath": "test/dataset/out"
});

/**
 * Test des fonctions de :
 *   - worker :
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
 * - worker.doTheJob()
 */
function testOf_doTheJob(fn, item, cb) {
  return fn(data[item.key], function(err, res) {
    item.result.include = worker.LOGS[item.key]; // Contiendra la valeur de l'erreur attendu
    const value = res[pkg.name][item.logs][res[pkg.name][item.logs].length - 1]; // Contiendra la valeur renvoyer par le module
    return cb(value);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - worker.categorize()
 */
function testOf_categorize(fn, item, cb) {
  cb(fn(item.arguments.identifier, item.arguments.table));
}