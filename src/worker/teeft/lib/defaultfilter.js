/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

const DefaultFilter = function(options) {

  // this reference
  const self = this,
    DEFAULT = { // Default values
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

  self.minOccur = (options && options.minOccur) ? options.minOccur : DEFAULT.minOccur;
  self.noLimitStrength = (options && options.noLimitStrength) ? options.noLimitStrength : DEFAULT.noLimitStrength;
  self.lengthSteps = (options && options.lengthSteps) ? options.lengthSteps : DEFAULT.lengthSteps;

  self.call = function(occur, strength) {
    return ((strength < self.noLimitStrength && occur >= self.minOccur) || (strength >= self.noLimitStrength));
  };

  self.configure = function(length) {
    if (!isNaN(length)) {
      if (length < self.lengthSteps.min.lim) {
        self.minOccur = self.lengthSteps.min.value;
        return self.lengthSteps.min.value;
      }
      for (let i = 0; i < self.lengthSteps.values.length; i++) {
        if (length < self.lengthSteps.values[i].lim) {
          self.minOccur = self.lengthSteps.values[i].value;
          return self.lengthSteps.values[i].value;
        }
      }
      self.minOccur = self.lengthSteps.max.value;
      return self.lengthSteps.max.value;
    }
    return null;
  };

  return self;
};

module.exports = DefaultFilter;