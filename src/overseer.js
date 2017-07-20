const fork = require("child_process").fork;

const Overseer = {};

Overseer.init = function (fileScript) {
  this.fork = fork(fileScript);
  this.on = this.fork.on.bind(this.fork);
};

Overseer.send = function (obj, done) {
  this.fork.send(obj, null, {}, done);
};

module.exports = Overseer;
