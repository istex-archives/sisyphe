/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */

/**
 * Constructor
 * @param {Object} options Options of constructor
 * @return this
 */
const Classifier = function(options) {
  // Default values
  const DEFAULT = {
    "tables": {}
  };
  this.tables = (options && options.tables) ? options.tables : DEFAULT.tables;
};

/**
 * Return each categories of a given Idenfier for a given table
 * @param {String} identifier Identifier of a docObject
 * @param {String} table Identifier of a table
 * @return {Array} An array containing all categories associated with this identifier for this table
 */
Classifier.prototype.classify = function(identifier, table) {
  let result = [];
  if (this.tables.hasOwnProperty(table) && this.tables[table].hasOwnProperty(identifier)) {
    const values = this.tables[table][identifier]; // All categegories associated with this identifier
    // Add category to the list
    if (values) {
      result.push({
        "id": table,
        "values": values
      });
    };
  }
  return result;
};

module.exports = Classifier;