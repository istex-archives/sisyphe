/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

const pkg = require("../package.json"),
  worker = require("../index.js"),
  fs = require("fs"),
  async = require("async"),
  TU = require("auto-tu");

// Test dataset for each tested function
const data = require("./dataset/in/data.json"),
  originalConfigTest = require("./dataset/in/sisyphe-conf.json"),
  datasets = {
    "worker": require("./dataset/in/test.worker.json")
  };

// Wrappers used for each tested function
const wrappers = {
  "worker": {
    "doTheJob": testOf_doTheJob,
    "categorize": testOf_categorize,
    "load": testOf_load
  }
};

// Tested object (only functions are "automatically" tested)
const objects = {
  "worker": worker
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
 *     - categorize()
 *     - load()
 */
// Test loop
async.eachSeries(Object.keys(datasets), function(key, callback) {
  TU.start({
    "description": pkg.name + "/index.js",
    "root": key,
    "object": objects[key],
    "dataset": datasets[key],
    "wrapper": wrappers[key]
  });
  return callback();
});

/**
 * Wrapper of :
 * - worker.doTheJob()
 */
function testOf_doTheJob(fn, item, cb) {
  return fn(data[item.key], function(err, res) {
    item.result.include = worker.LOGS[item.key]; // will contain the expected value
    const value = res[pkg.name][item.logs][res[pkg.name][item.logs].length - 1]; // will contain the returned value
    return cb(value);
  });
}

/**
 * Wrapper of :
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