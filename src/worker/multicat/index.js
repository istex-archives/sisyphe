/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  pkg = require("./package.json"),
  Classifier = require("./lib/classifier.js"),
  fs = require("fs"),
  path = require("path");

const worker = {
  /**
   * Init Function (called by sisyphe)
   * @param {Object} options Options passed by sisyphe
   * @return {undefined} Return undefined
   */
  "init": function(options) {
    this.outputPath = options.outputPath || path.join("out/", pkg.name);
    this.resources = this.load(options);
    this.classifier = new Classifier({
      "tables": this.resources.tables
    });
    this.LOGS = { // All logs available on this module
      "SUCCESS": "File created at ",
      "IDENTIFIER_NOT_FOUND": "IDENTIFIER not found",
      "IDENTIFIER_DOES_NOT_MATCH": "IDENTIFIER does not match any category"
    };
    return this;
  },
  /**
   * Categorize a XML document (called by sisyphe)
   * @param {Object} data data of the current docObject
   * @param {Function} next Callback funtion
   * @return {undefined} Asynchronous function
   */
  "doTheJob": function(data, next) {
    // reference to this
    const self = this;
    // Check resources are correctly loaded & MIME type of file & file is well formed
    if (!Object.keys(self.resources.tables).length ||  data.mimetype !== self.resources.parameters.input.mimetype || !data.isWellFormed) {
      return next(null, data);
    }
    // Errors & logs
    data[pkg.name] = {
      "errors": [],
      "logs": []
    };
    // Get the filename (without extension)
    const documentId = path.basename(data.name, data.extension ||  self.resources.parameters.input.extension);
    // Read MODS file
    fs.readFile(data.path, "utf-8", function(err, modsStr) {
      // I/O Errors
      if (err) {
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }
      // Get the identifier in the MODS file
      const $ = utils.XML.load(modsStr);
      let categories = [];
      for (let i = 0, l = self.resources.categorizations.length; i < l; i++) {
        const identifier = $(self.resources.categorizations[i].identifier).text();
        // Identifier not found
        if (!identifier) {
          data[pkg.name].logs.push(documentId + "\t" + self.LOGS.IDENTIFIER_NOT_FOUND);
          return next(null, data);
        }
        // Get categories for this identifier
        categories = categories.concat(self.classifier.classify(identifier, self.resources.categorizations[i].id));
      }
      // If no categories were found
      if (!categories.length) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.IDENTIFIER_DO_NOT_MATCH);
        return next(null, data);
      }
      self.NOW = utils.dates.now(); // Get the formated current date (String)
      // Build the structure of the template
      const tpl = {
          "date": self.NOW, // Current date
          "module": self.resources.module, // Configuration of module
          "parameters": self.resources.parameters, // Launch parameters of module
          "pkg": pkg, // Infos on module packages
          "document": { // Data of document
            "id": documentId,
            "categories": categories
          },
          categorizations: self.resources.categorizations // Infos on used categorizations
        },
        // Build path & filename of enrichment file
        output = utils.files.createPath({
          "outputPath": self.outputPath,
          "id": documentId,
          "type": self.resources.output.type,
          "label": pkg.name,
          "extension": self.resources.output.extension
        });
      // If no categories were found
      if (!categories.length) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.IDENTIFIER_DO_NOT_MATCH);
        return next(null, data);
      }
      // Write enrichment data
      utils.enrichments.write({
        "template": self.resources.template,
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
          "categories": categories,
          "output": {
            "path": path.join(output.directory, output.filename),
            "extension": self.resources.enrichment.extension,
            "original": self.resources.enrichment.original,
            "mimetype": self.resources.output.mimetype
          }
        };
        // Save enrichments in data
        data.enrichments = utils.enrichments.save(data.enrichments, {
          "enrichment": enrichment,
          "label": self.resources.module.label
        });
        // All clear
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.SUCCESS + output.filename);
        return next(null, data);
      });
    });
  },
  /**
   * Load all resources needed in this module
   * @param {Object} options Options passed by sisyphe
   * @return {Object} An object containing all the data loaded
   */
  "load": function(options) {
    let result = options.config ? options.config[pkg.name] : null;
    const folder = options.sharedConfigDir ? path.resolve(options.sharedConfigDir, pkg.name) : null;
    if (folder && result) {
      for (let i = 0; i < result.categorizations.length; i++) {
        result.tables[result.categorizations[i].id] = require(path.join(folder, result.categorizations[i].file));
      }
      result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
    } else {
      result = require("./conf/sisyphe-conf.json");
    }
    return result;
  }
};


module.exports = worker;