/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  pkg = require("./package.json"),
  fs = require("fs"),
  path = require("path"),
  Skeeft = require("./lib/skeeft.js");

const worker = {
  /**
   * Init Function (called by sisyphe)
   * @param {Object} options Options passed by sisyphe
   * @return {undefined} Return undefined
   */
  "init": function(options) {
    this.outputPath = options.outputPath || path.join("out/", pkg.name);
    this.resources = this.load(options);
    // Get a Skeeft instance
    this.skeeft = new Skeeft({
      "filters": this.resources.parameters.filters
    });
    this.LOGS = { // All logs available on this module
      "SUCCESS": "File created at ",
      "ERROR_TERMS": "Selected terms not found"
    };
    return this;
  },
  /**
   * Index a fulltext (called by sisyphe)
   * @param {Object} data data of the current docObject
   * @param {Function} next Callback funtion
   * @return {undefined} Asynchronous function
   */
  "doTheJob": function(data, next) {
    // reference to this
    const self = this;
    // Check resources are correctly loaded & MIME type of file & file is well formed
    if (!self.resources || data.mimetype !== self.resources.parameters.input.mimetype || !data.isWellFormed) {
      return next(null, data);
    }
    // Errors & logs
    data[pkg.name] = {
      "errors": [],
      "logs": []
    };
    // Get the filename (without extension)
    const documentId = path.basename(data.name, data.extension || self.resources.parameters.input.extension);
    // Read MODS file
    fs.readFile(data.path, "utf-8", function(err, modsStr) {
      // I/O Errors
      if (err) {
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }
      // Get the keywords exrated by skeeft
      const keywords = self.skeeft.index(modsStr, self.resources.parameters.selectors, self.resources.parameters.criterion);
      // If there is no term extracted
      if (keywords.length === 0) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ERROR_TERMS);
        return next(null, data);
      }
      self.NOW = utils.dates.now(); // Date du jour formatée (string)
      // Build the structure of the template
      const tpl = {
          "date": self.NOW, // Current date
          "module": self.resources.module, // Configuration of module
          "parameters": self.resources.parameters, // Launch parameters of module
          "filters": self.skeeft.filters, // Filters used
          "pkg": pkg, // Infos on module packages
          "document": { // Data of document
            "id": documentId,
            "keywords": keywords // Selected keywords
          }
        },
        // Build path & filename of enrichment file
        output = utils.files.createPath({
          "outputPath": self.outputPath,
          "id": documentId,
          "type": self.resources.output.type,
          "label": pkg.name,
          "extension": self.resources.output.extension
        });
      // Write enrichment data
      utils.enrichments.write({
        "template": self.resources.template,
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
          "keywords": keywords,
          "output": {
            "path": path.join(output.directory, output.filename),
            "extension": self.resources.enrichment.extension,
            "original": self.resources.enrichment.original,
            "mimetype": self.resources.output.mimetype
          }
        };
        // Save enrichments in data
        data.enrichments = utils.enrichments.save(data.enrichments, {
          "enrichment": {
            enrichment
          },
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
      result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
    } else {
      result = require("./conf/sisyphe-conf.json");
    }
    return result;
  }
};

module.exports = worker;