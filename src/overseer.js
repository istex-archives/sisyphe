const fork = require("child_process").fork;

const Overseer = {};

Overseer.init = function (fileScript) {
  this.fork = fork(fileScript);
  this.once = this.fork.once.bind(this.fork);
};

Overseer.send = function (obj, done) {
  this.fork.send(obj, null, {}, done);
};

module.exports = Overseer;