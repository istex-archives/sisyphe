'use strict'

const klaw = require('klaw'),
  util = require('util'),
  through2 = require('through2'),
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
  let walkEvent = new EventEmitter();
  let items = [];
  klaw(self.input)
  .pipe(excludeDirFilter)
  .on('data', function (item) {
    items.push(item.path);
    if (items.length === 100) {
      self.emit('files', items);
      items = [];
    }
  })
  .on('end', function () {
    self.emit('files', items);
    self.emit('end');
    items = null;
  })
  .on('error', function (err, item) {
    self.emit('err', err, item);
  });
};
module.exports = Walk;
