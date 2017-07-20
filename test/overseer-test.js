'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Overseer = require('../src/overseer');

describe(`${pkg.name}/src/overseer.js`, function () {
  describe("#init", function () {
    it("should be initialized successfully", function () {
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init(`${__dirname}/dumbWorker.js`);
      expect(bobTheOverseer.fork).to.be.an("object");
      expect(bobTheOverseer.fork).to.have.property("send");
      expect(bobTheOverseer.fork).to.have.property("kill");
    });
  });

  describe("#send", function () {
    it("should send some data", function (done) {
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init(`${__dirname}/dumbWorker.js`);
      const data = {
        id: 159,
        type: "pdf"
      };
      bobTheOverseer.send(data, (error) => {
        expect(error).to.be.null;
      });
      bobTheOverseer.on("message", (msg) => {
        expect(msg).to.be.an("object");
        expect(msg.isDone).to.be.true;
        done();
      })
    });
  });
});