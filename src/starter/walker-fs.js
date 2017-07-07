'use strict';

const walk = require('walk'),
  util = require('util'),
  through2 = require('through2'),
  async = require('async'),
  kue = require('kue'),
  fs = require('fs'),
  path = require('path');

let items = [],
  currentFoundFiles = 0, totalFoundFiles = 0;

process.on('message', function (options) {
  const queue = kue.createQueue();
  // updateLog('Sisyphe-core : kue is connecting to redis ...');
  queue.on('error', function( err ) {
    // updateLog('Sisyphe-core-error: kue ', err);
  });
  //Start walking folder
  async.eachSeries(options.input, function (element,next) {
    walkOnInput(queue,element,options,next);
  }, function (err) {
    // All sub-folder for this walker have been traited
    process.send({end: true});
  });
});

function walkOnInput(queue,element,options,cb) {
  let walker = walk.walk(path.join(options.pathInput, element));
  walker.on('file', function (root, stats, next) {
    items.push({
      extension: path.extname(stats.name),
      path: path.resolve(root, stats.name),
      name: stats.name,
      size: stats.size
    });
    if (items.length === 100) {
      createQueueFiles(items,queue,options);
    }
    next();
  })
  .on('end', function () {
    // All files (for this walker fork) have been discovered
    createQueueFiles(items,queue,options);
    cb();
  })
  .on('errors', function (root, nodeStatsArray, next) {
    // Should do something here
    next();
  });
}

function createQueueFiles(items,queue,options) {
  for(var i = 0; i < items.length; i++){
    currentFoundFiles++;
    let randomProcessor = Math.floor(Math.random() * options.chainJobsCPUS);
    items[i].info = { id: 0, type: options.workers[0].name};
    queue.create(`${options.workers[0].name}${randomProcessor}`, items[i]).removeOnComplete( true ).save();
  }
  process.send({currentFoundFiles});
  currentFoundFiles = 0;
  // Remove all element in items & prevent memory leak, DO NOT CREATE A new one, reference will not destroy it!!
  items.length = 0;
}