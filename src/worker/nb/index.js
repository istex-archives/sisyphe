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
  Classifier = require("./lib/classifier.js");

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
      "min": this.resources.parameters.min,
      "verbalization": this.resources.verbalization,
      "trainings": this.resources.trainings
    });
    this.LOGS = { // All logs available on this module
      "SUCCESS": "File created at ",
      "ABSTRACTS_NOT_FOUND": "Abstracts not found",
      "ABSTRACT_TAG_LANG_NOT_FOUND": "Abstract with correct tag lang not found",
      "ABSTRACT_DETECTED_LANG_NOT_FOUND": "Abstract with correct detected lang not found",
      "CATEGORY_NOT_FOUND": "Category not found",
      "VERBALIZATION_NOT_FOUND": "Verbalization not found"
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
    if (!Object.keys(self.resources.trainings).length ||  data.mimetype !== self.resources.parameters.input.mimetype || !data.isWellFormed) {
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
      // Get the identifier in the MODS file
      const $ = utils.XML.load(modsStr);
      let abstracts = [],
        abstract = $("abstract[lang=\"" + self.resources.parameters.lang + "\"]").text();
      // Abstract with the correct lang not found
      if (!abstract) {
        data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ABSTRACT_TAG_LANG_NOT_FOUND);
        abstracts = $("abstract").map(function(i, el) {
          return $(el).text();
        }).get();
        // Can't get an abstract
        if (!abstracts.length) {
          data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ABSTRACTS_NOT_FOUND);
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
            if (result.languages[0].percent >= self.resources.parameters.cld.percent && result.languages[0].code === self.resources.parameters.cld.code) abstract = item;
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
          data[pkg.name].logs.push(documentId + "\t" + self.LOGS.ABSTRACT_DETECTED_LANG_NOT_FOUND);
          return next(null, data);
        }
        // Get result of the categorization
        const result = self.classifier.classify(abstract);
        // Get catégories & verbalization errors
        const categories = result.categories,
          errors = result.errors;
        // If there is one (or more) errors of verbalization, write it in logs
        if (errors.length) data[pkg.name].logs.push(documentId + "\t" + self.LOGS.VERBALIZATION_NOT_FOUND + " (" + result.errors.join(",") + ")");
        // If no categories were found
        if (!categories.length) {
          data[pkg.name].logs.push(documentId + "\t" + self.LOGS.CATEGORY_NOT_FOUND);
          return next(null, data);
        }
        self.NOW = utils.dates.now(); // Date du jour formatée (string)
        // Build the structure of the template
        const tpl = {
            "date": self.NOW, // Current date
            "module": self.resources.module, // Configuration of module
            "parameters": self.resources.parameters, // Launch parameters of module
            "pkg": pkg, // Infos on module packages
            "document": { // Data of document
              "id": documentId,
              "categories": categories
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
      for (let key in result.trainings) {
        result.trainings[key] = require(path.join(folder, result.trainings[key]));
      }
      result.verbalization = require(path.join(folder, result.verbalization));
      result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
    } else {
      result = require("./conf/sisyphe-conf.json");
    }
    return result;
  }
};

module.exports = worker;