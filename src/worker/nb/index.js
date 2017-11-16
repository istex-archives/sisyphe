/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  cld = require("cld"),
  async = require("async"),
  fs = require("fs"),
  path = require("path"),
  pkg = require("./package.json"),
  NB = require("./lib/nb.js");

const worker = {};

/**
 * Init Function (called by sisyphe)
 * @param {Object} options Options passed by sisyphe
 * @return {undefined} Return undefined
 */
worker.init = function(options) {
  worker.outputPath = options.outputPath || path.join("out/", pkg.name);
  worker.resources = worker.load(options);
  worker.LOGS = { // All logs available on this module
    "SUCCESS": "File created at ",
    "ABSTRACTS_NOT_FOUND": "Abstracts not found",
    "ABSTRACT_TAG_LANG_NOT_FOUND": "Abstract with correct tag lang not found",
    "ABSTRACT_DETECTED_LANG_NOT_FOUND": "Abstract with correct detected lang not found",
    "CATEGORY_NOT_FOUND": "Category not found",
    "VERBALIZATION_NOT_FOUND": "Verbalization not found"
  };
}

/**
 * Categorize a XML document (called by sisyphe)
 * @param {Object} data data of the current docObject
 * @param {Function} next Callback funtion
 * @return {undefined} Asynchronous function
 */
worker.doTheJob = function(data, next) {
  // Check resources are correctly loaded & MIME type of file & file is well formed
  if (!Object.keys(worker.resources.trainings).length ||  data.mimetype !== worker.resources.parameters.input.mimetype || !data.isWellFormed) {
    return next(null, data);
  }
  // Errors & logs
  data[pkg.name] = {
    "errors": [],
    "logs": []
  };
  // Get the filename (without extension)
  const documentId = path.basename(data.name, data.extension || worker.resources.parameters.input.extension);
  // Read MODS file
  fs.readFile(data.path, "utf-8", function(err, modsStr) {
    // I/O Errors
    if (err) {
      data[pkg.name].errors.push(err.toString());
      return next(null, data);
    }
    // Get the identifier in the MODS file
    const $ = utils.XML.load(modsStr);
    let abstracts = [],
      abstract = $("abstract[lang=\"" + worker.resources.parameters.lang + "\"]").text();
    // Abstract with the correct lang not found
    if (!abstract) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ABSTRACT_TAG_LANG_NOT_FOUND);
      abstracts = $("abstract").map(function(i, el) {
        return $(el).text();
      }).get();
      // Can't get an abstract
      if (!abstracts.length) {
        data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ABSTRACTS_NOT_FOUND);
        return next(null, data);
      }
    }
    // For each abstract with another language than that wanted
    async.eachSeries(abstracts, function(item, callback) {
      cld.detect(item, {
        "isHTML": false,
        "encodingHint": "UTF8",
      }, function(err, result) {
        if (err) return callback(err);
        if (!result) return callback();
        if (result.reliable && result.languages.length) {
          if (result.languages[0].percent >= worker.resources.parameters.cld.percent && result.languages[0].code === worker.resources.parameters.cld.code) abstract = item;
        }
        callback();
      });
    }, function(err) {
      if (err) {
        data[pkg.name].errors.push(err);
        return next(null, data);
      }
      // Abstract with the correct language not found after detection
      if (!abstract) {
        data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ABSTRACT_DETECTED_LANG_NOT_FOUND);
        return next(null, data);
      }
      // Get result of the categorization
      const result = worker.categorize(abstract);
      // Get catégories & verbalization errors
      const categories = result.categories,
        errors = result.errors;
      // If there is one (or more) errors of verbalization, write it in logs
      if (errors.length) data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.VERBALIZATION_NOT_FOUND + " (" + result.errors.join(",") + ")");
      // If no categories were found
      if (!categories.length) {
        data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.CATEGORY_NOT_FOUND);
        return next(null, data);
      }
      worker.NOW = utils.dates.now(); // Date du jour formatée (string)
      // Build the structure of the template
      const tpl = {
          "date": worker.NOW, // Current date
          "module": worker.resources.module, // Configuration of module
          "parameters": worker.resources.parameters, // Launch parameters of module
          "pkg": pkg, // Infos on module packages
          "document": { // Data of document
            "id": documentId,
            "categories": categories
          }
        },
        // Build path & filename of enrichment file
        output = utils.files.createPath({
          "outputPath": worker.outputPath,
          "id": documentId,
          "type": worker.resources.output.type,
          "label": pkg.name,
          "extension": worker.resources.output.extension
        });
      // Write enrichment data
      utils.enrichments.write({
        "template": worker.resources.template,
        "data": tpl,
        "output": output
      }, function(err) {
        if (err) {
          // I/O Error
          data[pkg.name].errors.push(err.toString());
          return next(null, data);
        }
        // Create an Object representation of created enrichment
        const enrichment = {
          "path": path.join(output.directory, output.filename),
          "extension": worker.resources.enrichment.extension,
          "original": worker.resources.enrichment.original,
          "mimetype": worker.resources.output.mimetype
        };
        // Save enrichments in data
        data.enrichments = utils.enrichments.save(data.enrichments, {
          "enrichment": enrichment,
          "label": worker.resources.module.label
        });
        // All clear
        data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.SUCCESS + output.filename);
        return next(null, data);
      });
    });
  });
};

/**
 * Return each categories guessed by Naive Bayesian
 * @param {String} text Text to classify
 * @return {Array} Array containing all categories
 */
worker.categorize = function(text) {
  // Instance of a Naive Bayesian
  const nb = new NB(worker.resources.parameters.probability.min),
    categories = [],
    errors = [];
  let training = worker.resources.trainings.entry,
    level = 0,
    next = true;
  // Guess the categories using trainings
  while (next) {
    nb.load(training); // Loading the current categories
    let result = nb.guess(text); // Guess the category
    if (result.category) {
      // Verbalization of the guessed category
      const verbalization = worker.resources.verbalization[result.category];
      if (!verbalization) errors.push(result.category);
      // Add the guessed result
      categories.push({
        "code": result.category,
        "probability": result.probability,
        "verbalization": worker.resources.verbalization[result.category],
        "level": ++level // Increase the category level
      });
    }
    next = worker.resources.trainings.hasOwnProperty(result.category); // Check if there is an available next training
    if (next) {
      training = worker.resources.trainings[result.category]; // Define the next training
    }
  }
  return {
    "categories": categories,
    "errors": errors
  };
};

/**
 * Load all resources needed in this module
 * @param {Object} options Options passed by sisyphe
 * @return {Object} An object containing all the data loaded
 */
worker.load = function(options) {
  let result = options.config ? options.config[pkg.name] : null;
  const folder = options.sharedConfigDir ? path.resolve(options.sharedConfigDir, pkg.name) : null;
  if (folder && result) {
    for (let key in result.trainings) {
      result.trainings[key] = require(path.join(folder, result.trainings[key]));
    }
    result.verbalization = require(path.join(folder, result.verbalization));
    result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
  } else {
    result = require("./conf/sisyphe-conf.json");
  }
  return result;
};

module.exports = worker;