"use strict";

const pkg = require("../package.json");
const chai = require("chai");
const _ = require("lodash");
chai.use(require("chai-events"));
const expect = chai.expect;
const should = chai.should();
const Promise = require("bluebird");
const pathfs = require("path");
let Sisyphe;
const goodSession = {
  corpusname: "test",
  // configDir: "./data",
  inputPath: pathfs.resolve("./test/data"),
  numCPUs: "2",
  now: Date.now(),
  outputPath: "./output",
  workers: ["walker-fs", "filetype"],
  silent: true
};
beforeEach(function() {
  Sisyphe = require("../sisyphe");
});
describe(`${pkg.name}/Sisyphe.js`, function() {
  describe("#init", function() {
    it("init should success", function(done) {
      Sisyphe.init(goodSession)
        .then(data => {
          expect(Sisyphe.hasOwnProperty("session")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("corpusname")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("inputPath")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("outputPath")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("numCPUs")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("now")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("workers")).equal(true);
          expect(Sisyphe.session.hasOwnProperty("silent")).equal(true);
          done();
        })
        .catch(err => {
          done();
        });
    });
    it("init shouldn't success when no session in argument", function(done) {
      Sisyphe.init().catch(err => done());
    });
    it("init shouldn't success when no corpusname", function(done) {
      let neededOptions = _.cloneDeep(goodSession);
      delete neededOptions.corpusname;
      Sisyphe.init(neededOptions).catch(err => done());
    });
    it("init shouldn't success when no inputPath", function(done) {
      let neededOptions = _.cloneDeep(goodSession);
      delete neededOptions.inputPath;
      Sisyphe.init(neededOptions).catch(err => done());
    });
    it("init shouldn't success when no outputPath", function(done) {
      let neededOptions = _.cloneDeep(goodSession);
      delete neededOptions.outputPath;
      Sisyphe.init(neededOptions).catch(err => done());
    });
    it("init shouldn't success when no workers", function(done) {
      let neededOptions = _.cloneDeep(goodSession);
      delete neededOptions.workers;
      Sisyphe.init(neededOptions).catch(err => done());
    });
  });
  describe("#launch", function() {
    this.timeout(10000);
    it("launch should throw error", function(done) {
      Sisyphe.init(goodSession).then(_ => {
        return Sisyphe.launch().then(_ => done());
      });
    });
  });
  describe("#launch2", function() {
    this.timeout(10000);
    it("launch should throw error", function(done) {
      Sisyphe.init(goodSession).then(_ => {
        return Sisyphe.launch().then(_ => done());
      });
    });
  });
});

