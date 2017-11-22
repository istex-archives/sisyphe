/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const NB = require("./nb.js");

/**
 * Constructor
 * @param {Object} options Options of constructor
 * @return this
 */
const Classifier = function(options) {
  // Default values
  const DEFAULT = {
      "min": 0,
      "verbalization": 0,
      "trainings": {}
    },
    minProbability = (options && options.min) ? options.min : DEFAULT.min;
  // Instance of a Naive Bayesian
  this.nb = new NB(minProbability);
  this.verbalization = (options && options.verbalization) ? options.verbalization : DEFAULT.verbalization;
  this.trainings = (options && options.trainings) ? options.trainings : DEFAULT.trainings;
};

/**
 * Return each categories guessed by Naive Bayesian
 * @param {String} text Text to classify
 * @return {Array} Array containing all categories
 */
Classifier.prototype.classify = function(text) {
  let training = this.trainings.entry,
    categories = [],
    errors = [],
    level = 0,
    next = true;
  // Guess the categories using trainings
  while (next) {
    this.nb.load(training); // Loading the current categories
    let result = this.nb.guess(text); // Guess the category
    if (result.category) {
      // Verbalization of the guessed category
      const verbalization = this.verbalization[result.category];
      if (!verbalization) errors.push(result.category);
      // Add the guessed result
      categories.push({
        "code": result.category,
        "probability": result.probability,
        "verbalization": this.verbalization[result.category],
        "level": ++level // Increase the category level
      });
    }
    next = this.trainings.hasOwnProperty(result.category); // Check if there is an available next training
    if (next) {
      training = this.trainings[result.category]; // Define the next training
    }
  }
  return {
    "categories": categories,
    "errors": errors
  };
};

module.exports = Classifier;