"use strict";

const pkg = require("../package.json");
const chai = require("chai");
const expect = chai.expect;
const path = require("path");
let monitor = Object.create(require("../src/monitoring"));

beforeEach(function() {
  monitor.log = {
    error: [],
    warning: [],
    info: []
  };
});

describe(`${pkg.name}/src/monitoring.js`, function() {
  this.timeout(20000);
  describe("#init", function() {
    it("should be initialized successfully", function() {
      expect(monitor).to.have.property("log");
      expect(monitor.log).to.have.property("error");
      expect(monitor.log).to.have.property("warning");
      expect(monitor.log).to.have.property("info");
    });
  });
  describe("#updateLog", function() {
    it("should be update the log info", async function() {
      await monitor.updateLog("info", "info");
      expect(monitor.log.info).to.include.members(["info"]);
    });
    it("should be update the log warning", async function() {
      await monitor.updateLog("warning", "warning");
      expect(monitor.log.warning).to.include.members(["warning"]);
    });
    it("should be update error when error is received", async function() {
      await monitor.updateLog("error", "error");
      expect(monitor.log.error).to.not.have.include.members(["error"]);
      expect(monitor.log.error[0]).to.have.own.property("message");
      expect(monitor.log.error[0].message).to.be.equal("error");
      expect(monitor.log.error[0]).to.have.own.property("stack");
    });
  });
  describe("#updateError", function() {
    it("should be format error when string is received", async function() {
      const errors = monitor.log.error;
      await monitor.updateError("error");
      expect(errors[0]).have.own.property("message");
      expect(errors[0].message).to.be.equal("error");
      expect(errors[0]).have.own.property("stack");
      expect(errors[0].stack).to.be.equal('');
    });

    it("should be push an error when an error is received", async function() {
      await monitor.updateError(new Error("error1"));
      const errors = monitor.log.error;
      expect(errors[0]).have.own.property("message");
      expect(errors[0].message).to.be.equal("error1");
      expect(errors[0]).have.own.property("stack");
      expect(errors[0].stack).to.not.be.undefined;
    });

    it("should be push an error when object with message and stack is received", async function() {
      const errors = monitor.log.error;
      await monitor.updateError({
        message: "error2",
        stack: "/aaa",
        infos: "infos"
      });
      expect(errors[0]).have.own.property("message");
      expect(errors[0].message).to.be.equal("error2");
      expect(errors[0]).have.own.property("stack");
      expect(errors[0].stack).to.be.equal("/aaa");
      expect(errors[0]).have.own.property("infos");
      expect(errors[0].infos).to.be.equal("infos");
    });
  });
});
