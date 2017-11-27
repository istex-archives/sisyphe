/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  pkg = require("./package.json"),
  fs = require("fs"),
  path = require("path"),
  Teeft = require('./lib/teeft.js');

const worker = {
  /**
   * Init Function (called by sisyphe)
   * @param {Object} options Options passed by sisyphe
   * @return {undefined} Return undefined
   */
  "init": function(options) {
    this.outputPath = options.outputPath || path.join("out/", pkg.name);
    this.resources = this.load(options);
    this.teeft = new Teeft({
      "filter": this.resources.parameters.filter,
      "stopwords": this.resources.stopwords,
      "dictionary": this.resources.dictionary
    });
    this.LOGS = { // All logs available on this module
      "SUCCESS": "File created at ",
      "ERROR_EXTRACTION": "Extracted terms not found",
      "ERROR_VALIDATION": "Valid terms not found",
      "ERROR_LEMMATIZATION": "Lemmatized terms not found",
      "ERROR_TOKENIZATION": "Tokens not found",
      "ERROR_TAGGER": "Tagged tokens not found"
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
    // Check resources are correctly loaded & MIME type of file
    if (!self.resources || data.mimetype !== self.resources.parameters.input.mimetype) {
      return next(null, data);
    }
    // Errors & logs
    data[pkg.name] = {
      errors: [],
      logs: []
    };
    // Get the filename (without extension)
    const documentId = path.basename(data.name, data.extension || self.resources.parameters.input.extension);
    // Read TXT file
    fs.readFile(data.path, "utf-8", function(err, txt) {
      // I/O Errors
      if (err) {
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }
      // Get the text representation
      const text = self.teeft.index(txt, {
        "truncate": self.resources.parameters.truncate,
        "sort": self.resources.parameters.sort
      });
      // If there is no token, log it
      if (text.tokens.length === 0) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ERROR_TOKENIZATION);
        return next(null, data);
      }
      // If there is no tagged term, log it
      if (text.terms.tagged.length === 0) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ERROR_TAGGER);
        return next(null, data);
      }
      // If there is no lemmatized term, log it
      if (text.terms.lemmatized.length === 0) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ERROR_LEMMATIZATION);
        return next(null, data);
      }
      // If there is no sanitized term, log it
      if (text.terms.sanitized.length === 0) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ERROR_VALIDATION);
        return next(null, data);
      }
      // If there is no extracted term, log it
      if (text.extraction.keys.length === 0) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ERROR_EXTRACTION);
        return next(null, data);
      }
      self.NOW = utils.dates.now(); // Date du jour formatée (string)
      // Build the structure of the template
      const tpl = {
          "date": self.NOW, // Current date
          "module": self.resources.module, // Configuration of module
          "parameters": self.resources.parameters, // Launch parameters of module
          "filter": self.teeft.extractor.filter, // Filter used
          "pkg": pkg, // Infos on module packages
          "document": { // Data of document
            "id": documentId,
            "keywords": text.keywords
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
          "keywords": text.keywords,
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
      result.dictionary = require(path.join(folder, result.dictionary));
      result.stopwords = require(path.join(folder, result.stopwords));
      result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
    } else {
      result = require("./conf/sisyphe-conf.json");
    }
    return result;
  }
};

module.exports = worker;