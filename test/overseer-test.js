'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Overseer = require('../src/overseer');

describe(`${pkg.name}/src/worker.js`, function () {
  describe("#init", function () {
    it("should be initialized successfully", function () {
      const bobTheWorker = Object.create(Overseer);
      bobTheWorker.init(`${__dirname}/dumbWorker.js`);
      expect(bobTheWorker.fork).to.be.an("object");
      expect(bobTheWorker.fork).to.have.property("send");
      expect(bobTheWorker.fork).to.have.property("kill");
    });
  });

  describe("#send", function () {
    it("should send some data", function (done) {
      const bobTheWorker = Object.create(Overseer);
      bobTheWorker.init(`${__dirname}/dumbWorker.js`);
      const data = {
        id: 123,
        type: "pdf"
      };
      bobTheWorker.send(data, (error) => {
        expect(error).to.be.null;
      });
      bobTheWorker.fork.on("message", (msg) => {
        expect(msg.isValid).to.be.true;
        done();
      })
    });
  });
});