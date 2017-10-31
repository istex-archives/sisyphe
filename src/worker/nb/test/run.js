/* global __dirname, require, process, it */
"use strict";

const pkg = require("../package.json"),
  worker = require("../index.js"),
  fs = require("fs"),
  async = require("async"),
  TU = require("auto-tu");

// Données de test
const data = require("./dataset/in/data.json"),
  originalConfigTest = require("./dataset/in/sisyphe-conf.json"),
  datasets = {
    "worker": require("./dataset/in/test.worker.json")
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
const wrappers = {
  "worker": {
    "doTheJob": testOf_doTheJob,
    "categorize": testOf_categorize,
    "load": testOf_load
  }
};

const objects = {
  "worker": worker
};

worker.init({
  "outputPath": "test/dataset/out",
  "config": JSON.parse(JSON.stringify(originalConfigTest)),
  "sharedConfigDir": "test/dataset/in/shared"
});

/**
 * Test des fonctions de :
 *   - worker :
 *     - doTheJob()
 */
// Pour chaque clé
async.eachSeries(Object.keys(datasets), function(key, callback) {
  TU.start({
    description: pkg.name + "/index.js",
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
  fs.readFile(item.arguments.path, "utf-8",
    function(err, res) {
      if (err) throw err;
      cb(fn(res).categories);
    });
}

/**
 * Wrapper of :
 * - worker.load()
 */
function testOf_load(fn, item, cb) {
  item.arguments.options.config = (item.arguments.options.config) ? JSON.parse(JSON.stringify(originalConfigTest)) : {}; // If we need a config in this test, we will use the configTest
  const value = fn(item.arguments.options);
  return cb(Object.keys(value.trainings));
}