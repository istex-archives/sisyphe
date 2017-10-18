/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

let Backbone = require('backbone');

module.exports = Backbone.Model.extend({

  defaults: {
    minOccur: 10,
    noLimitStrength: 2,
    lengthSteps: {
      values: [{
        lim: 3000,
        value: 4
      }],
      min: {
        lim: 1000,
        value: 1
      },
      max: {
        lim: 6000,
        value: 7
      }
    }
  },

  call: function(occur, strength) {
    return ((strength < this.get('noLimitStrength') && occur >= this.get('minOccur')) ||
      (strength >= this.get('noLimitStrength')));
  },

  configure: function(length) {
    if (!isNaN(length)) {
      if (length < this.get('lengthSteps').min.lim) {
        this.set('minOccur', this.get('lengthSteps').min.value);
        return this.get('lengthSteps').min.value;
      }
      for (let i = 0; i < this.get('lengthSteps').values.length; i++) {
        if (length < this.get('lengthSteps').values[i].lim) {
          this.set('minOccur', this.get('lengthSteps').values[i].value);
          return this.get('lengthSteps').values[i].value;
        }
      }
      this.set('minOccur', this.get('lengthSteps').max.value);
      return this.get('lengthSteps').max.value;
    }
    return null;
  }
});