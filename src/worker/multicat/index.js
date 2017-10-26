/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  config = require("./config.json"),
  pkg = require("./package.json"),
  fs = require("fs"),
  path = require("path");

const worker = {};


/**
 * Init Function (called by sisyphe)
 * @param {Object} options Options passed by sisyphe
 * @return {undefined} Return undefined
 */
worker.init = function(options = {
  corpusname: "default"
}) {
  worker.outputPath = options.outputPath || path.join("out/", pkg.name);
  worker.resources = worker.load(options.configDir, options.config);
  worker.NOW = utils.dates.now(); // Get the formated current date (String)
  worker.LOGS = { // All logs available on this module
    "SUCCESS": "TEI file created at ",
    "IDENTIFIER_NOT_FOUND": "IDENTIFIER not found",
    "IDENTIFIER_DOES_NOT_MATCH": "IDENTIFIER does not match any category"
  };
}

/**
 * Categorize a XML document (called by sisyphe)
 * @param {Object} data data of the current docObject
 * @param {Function} next Callback funtion
 * @return {undefined} Asynchronous function
 */
worker.doTheJob = function(data, next) {
  // Check MIME type of file
  if (data.mimetype !== "application/xml" || !data.isWellFormed) {
    return next(null, data);
  }
  // Errors & logs
  data[pkg.name] = {
    errors: [],
    logs: []
  };
  // Get the filename (without extension)
  const documentId = path.basename(data.name, ".xml");
  // Read MODS file
  fs.readFile(data.path, "utf-8", function(err, modsStr) {
    // I/O Errors
    if (err) {
      data[pkg.name].errors.push(err.toString());
      return next(null, data);
    }
    // Récupération de l'identifier
    const $ = utils.XML.load(modsStr);
    let categories = [];
    for (let i = 0, l = worker.resources.categorizations.length; i < l; i++) {
      const identifier = $(worker.resources.categorizations[i].identifier).text();
      // Identifier not found
      if (!identifier) {
        data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.IDENTIFIER_NOT_FOUND);
        return next(null, data);
      }
      // Get categories for this identifier
      categories = categories.concat(worker.categorize(identifier, worker.resources.categorizations[i].id));
    }
    // If no categories were found
    if (!categories.length) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.IDENTIFIER_DO_NOT_MATCH);
      return next(null, data);
    }
    // Build the structure of the template
    const tpl = {
        "date": worker.NOW, // Current date
        "module": config, // Configuration of module
        "pkg": pkg, // Infos on module packages
        "document": { // Data of document
          "id": documentId,
          "categories": categories
        },
        categorizations: worker.resources.categorizations // Infos on used categorizations
      },
      // Build path & filename of enrichment file
      output = utils.files.createPath({
        outputPath: worker.outputPath,
        id: documentId,
        type: "enrichments",
        label: pkg.name,
        // extension: ["_", config.version, "_", config.training, ".tei.xml"].join(")
        extension: ".tei.xml"
      });
    // Write enrichment data
    utils.enrichments.write({
      "template": worker.resources.template,
      "data": tpl,
      "output": output
    }, function(err) {
      // I/O Error
      if (err) {
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }
      // Create an Object representation of created enrichment
      const enrichment = {
        "path": path.join(output.directory, output.filename),
        "extension": "tei",
        "original": false,
        "mime": "application/tei+xml"
      };
      // Save enrichments in data
      data.enrichments = utils.enrichments.save(data.enrichments, {
        "enrichment": enrichment,
        "label": config.label
      });
      // All clear
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.SUCCESS + output.filename);
      return next(null, data);
    });
  });
};

/**
 * Return each categories of a given Idenfier for a given table
 * @param {String} identifier Identifier of a docObject
 * @param {String} table Identifier of a table
 * @return {Array} An array containing all categories associated with this identifier for this table
 */
worker.categorize = function(identifier, table) {
  let result = [];
  if (worker.resources.tables.hasOwnProperty(table) && worker.resources.tables[table].hasOwnProperty(identifier)) {
    const values = worker.resources.tables[table][identifier]; // All categegories associated with this identifier
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

/**
 * Load all resources needed in this module
 * @param {String} configDir Path to the configuration directory
 * @param {Object} config Object representation of sisyphe config file
 * @return {Object} An object containing all the data loaded
 */
worker.load = (configDir, config) => {
  const result = config[pkg.name],
    folder = path.resolve(configDir, "../", "shared", pkg.name);
  if (result) {
    for (let i = 0; i < result.categorizations.length; i++) {
      result.tables[result.categorizations[i].id] = require(path.join(folder, result.categorizations[i].file));
    }
    result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
  }
  return result;
};

module.exports = worker;