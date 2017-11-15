/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

const pkg = require("../package.json"),
  worker = require("../index.js"),
  Matrix = require("../lib/matrix.js"),
  math = require("mathjs"),
  fs = require("fs"),
  async = require("async"),
  TU = require("auto-tu");

// Test dataset for each tested function
const data = require("./dataset/in/data.json"),
  originalConfigTest = require("./dataset/in/sisyphe-conf.json"),
  datasets = {
    "worker": require("./dataset/in/test.worker.json"),
    "matrix": require("./dataset/in/test.matrix.json")
  };

// Wrappers used for each tested function
const wrappers = {
  "worker": {
    "doTheJob": testOf_doTheJob,
    "load": testOf_load,
    "index": testOf_index
  },
  "matrix": {
    "init": testOf_init,
    "fill": testOf_fill,
    "stats": testOf_stats,
    "select": testOf_select,
    "sort": testOf_sort,
    "compare": testOf_compare
  }
};

// Tested object (only functions are "automatically" tested)
const objects = {
  "worker": worker,
  "matrix": new Matrix()
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
 *   - matrix :
 *     - init()
 *     - fill()
 *     - stats()
 *     - select()
 *     - sort()
 *     - compare()
 */
// Test loop
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
 * Wrapper of :
 * - worker.doTheJob()
 */
function testOf_doTheJob(fn, item, cb) {
  return fn(data[item.key], function(err, res) {
    item.result.include = worker.LOGS[item.key]; // will contain the expected value
    const value = res[pkg.name][item.logs][res[pkg.name][item.logs].length - 1];  // will contain the returned value
    return cb(value);
  });
}

/**
 * Wrapper of :
 * - worker.load()
 */
function testOf_load(fn, item, cb) {
  item.arguments.options.config = (item.arguments.options.config) ? JSON.parse(JSON.stringify(originalConfigTest)) : {}; // If we need a config in this test, we will use the configTest
  const value = fn(item.arguments.options);
  return cb(value.template);
}

/**
 * Wrapper of :
 * - worker.index()
 */
function testOf_index(fn, item, cb) {
  fs.readFile(item.arguments.path, "utf-8", function(err, res) {
    if (err) throw err;
    const result = fn(res, item.arguments.selectors, item.arguments.criteria);
    return cb(Object.keys(result));
  });
}

/**
 * Wrapper of :
 * - matrix.init()
 */
function testOf_init(fn, item, cb) {
  fn(item.arguments.indexations, item.arguments.selectors);
  return cb(Object.keys(objects.matrix.mapping));
}

/**
 * Wrapper of :
 * - matrix.fill()
 */
function testOf_fill(fn, item, cb) {
  const m = fn(item.arguments.criteria);
  return cb(m.toString());
}

/**
 * Wrapper of :
 * - matrix.stats()
 */
function testOf_stats(fn, item, cb) {
  const result = fn(math.matrix(item.arguments.m));
  return cb(JSON.stringify(result));
}

/**
 * Wrapper of :
 * - matrix.select()
 */
function testOf_select(fn, item, cb) {
  item.arguments.stats.FR = math.matrix(item.arguments.stats.FR);
  item.arguments.stats.FP = math.matrix(item.arguments.stats.FP);
  item.arguments.stats.FF = math.matrix(item.arguments.stats.FF);
  const result = fn(item.arguments.stats, item.arguments.boost);
  return cb(Object.keys(result).toString());
}

/**
 * Wrapper of :
 * - matrix.sort()
 */
function testOf_sort(fn, item, cb) {
  let result = [];
  fn(item.arguments.terms).map(function(el, i) {
    result.push(el.term);
  });
  return cb(result.toString());
}

/**
 * Wrapper of :
 * - matrix.compare()
 */
function testOf_compare(fn, item, cb) {
  return cb(fn(item.arguments.a, item.arguments.b));
}