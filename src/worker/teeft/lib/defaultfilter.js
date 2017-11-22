/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/**
 * Constructor
 * @param {Object} options Options : minOccur + noLimitStrength + lengthSteps
 * @return this
 */
const DefaultFilter = function(options) {
  // Default values
  const DEFAULT = {
    "lengthSteps": {
      "values": [{
        "lim": 3000,
        "value": 4
      }],
      "min": {
        "lim": 1000,
        "value": 1
      },
      "max": {
        "lim": 6000,
        "value": 7
      }
    },
    "minOccur": 7,
    "noLimitStrength": 2
  };
  this.minOccur = (options && options.minOccur) ? options.minOccur : DEFAULT.minOccur;
  this.noLimitStrength = (options && options.noLimitStrength) ? options.noLimitStrength : DEFAULT.noLimitStrength;
  this.lengthSteps = (options && options.lengthSteps) ? options.lengthSteps : DEFAULT.lengthSteps;
  return this;
};

/**
 * Check values depending of filter conditions
 * @param {Integer} occur Occurence value
 * @param {Integer} strength Strength value
 * @return {Boolean} Return true if conditions are respected
 */
DefaultFilter.prototype.call = function(occur, strength) {
  return ((strength < this.noLimitStrength && occur >= this.minOccur) || (strength >= this.noLimitStrength));
};

/**
 * Configure the filter depending of lengthSteps
 * @param {Integer} length List of terms
 * @return {Array} List of tagged terms
 */
DefaultFilter.prototype.configure = function(length) {
  if (!isNaN(length)) {
    if (length < this.lengthSteps.min.lim) {
      this.minOccur = this.lengthSteps.min.value;
      return this.lengthSteps.min.value;
    }
    for (let i = 0; i < this.lengthSteps.values.length; i++) {
      if (length < this.lengthSteps.values[i].lim) {
        this.minOccur = this.lengthSteps.values[i].value;
        return this.lengthSteps.values[i].value;
      }
    }
    this.minOccur = this.lengthSteps.max.value;
    return this.minOccur;
  }
  return null;
};

module.exports = DefaultFilter;