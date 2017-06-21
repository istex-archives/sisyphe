'use strict';

const walk = require('walk'),
  util = require('util'),
  through2 = require('through2'),
  path = require('path'),
  EventEmitter = require("events").EventEmitter;

let excludeDirFilter = through2.obj(function (item, enc, next) {
  if (!item.stats.isDirectory()) {
    this.push(item);
  }
  next();
});

function Walk(input){
  this.input = input;
}

util.inherits(Walk, EventEmitter);
Walk.prototype.getFiles = function() {
  var self = this;
  let walkEvent = new EventEmitter(),
    items = [],
    walker = walk.walk(this._path);

  walker
  .on('file', function (root, stats, next) {
    items.push({
      extension: path.extname(stats.name),
      path: path.resolve(root, stats.name),
      name: stats.name,
      size: stats.size
    });
    if (items.length === 100) {
      self.emit('files', items);
      items = [];
    }
    next();
  })
  .on('end', function () {
    self.emit('files', items);
    self.emit('end');
    items = null;
  })
  .on('errors', function (root, nodeStatsArray, next) {
    // Should do something here
    next();
  });
};
module.exports = Walk;
