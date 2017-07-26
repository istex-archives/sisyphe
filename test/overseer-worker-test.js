'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Overseer = require('../src/overseer');

describe(`${pkg.name}/src/overseer.js`, function () {
  describe('#init', function () {
    it('should be initialized successfully', function (done) {
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init('dumbWorker', {id: 123}).catch(error => {
        expect(error).to.be.null;
      });
      bobTheOverseer.on('message', msg => {
        expect(msg.type).to.equal('initialize');
        expect(msg.worker).to.equal('dumbWorker');
        expect(msg.isInitialized).to.be.true;
        expect(msg.options.id).to.equal(123);
        done();
      });
    });

    it('should be initialized successfully with default options', function (done) {
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init('dumbWorker').catch(error => {
        expect(error).to.be.null;
      });
      bobTheOverseer.on('message', msg => {
        expect(msg.type).to.equal('initialize');
        expect(msg.worker).to.equal('dumbWorker');
        expect(msg.isInitialized).to.be.true;
        done();
      });
    });

    it("shouldn't be initialized and return an error", function (done) {
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init('veryDumbWorker').catch(error => {
        expect(error).to.be.null;
      });
      bobTheOverseer.on('message', msg => {
        expect(msg.type).to.equal('error');
        expect(msg.code).to.equal('MODULE_NOT_FOUND');
        done();
      });
    });
  });

  describe('#send', function () {
    this.timeout(10000);
    it('should send some data', function (done) {
      const data = {
        number: 159,
        type: 'pdf'
      };
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer
        .init('dumbWorker')
        .then(() => {
          return bobTheOverseer.send(data);
        })
        .catch(error => {
          expect(error).to.be.null;
        });

      bobTheOverseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          expect(msg.type).to.equal('job');
          expect(msg.data.number).to.equal(159);
          expect(msg.data.id).to.equal(123456);
          expect(msg.data.type).to.equal('pdf');
          done();
        }
      });
    });

    it('should failed to send some data', function (done) {
      const data = {
        id: 951,
        type: 'pdf'
      };
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer
        .init('dumbWorker')
        .then(() => {
          bobTheOverseer.fork.kill();
        });

      bobTheOverseer.on('exit', (code, signal) => {
        bobTheOverseer.send(data).catch((error) => {
          expect(error).to.be.an('Error');
          done();
        });
      });
      bobTheOverseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          console.log(msg);
          expect(msg.type).to.equal('job');
          expect(msg.data).to.deep.equal(data);
          done();
        }
      });
    });
  });
});
