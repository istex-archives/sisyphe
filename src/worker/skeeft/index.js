/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const utils = require("worker-utils"),
  pkg = require("./package.json"),
  fs = require("fs"),
  path = require("path"),
  teeft = require("../teeft/"),
  Matrix = require("./lib/matrix.js"),
  extend = require("util")._extend;

const worker = {};

/**
 * Init Function (called by sisyphe)
 * @param {Object} options Options passed by sisyphe
 * @return {undefined} Return undefined
 */
worker.init = function(options) {
  worker.outputPath = options.outputPath || path.join("out/", pkg.name);
  worker.resources = worker.load(options);
  // Init teeft
  teeft.init(options);
  // Define extractors, one used only to extract title keywords, the other processing fulltext.
  worker.extractors = {
    "title": extend({}, teeft),
    "fulltext": extend({}, teeft)
  };
  // Define filters, one used only to extract title keywords, the other processing fulltext.
  worker.filters = {
    "title": new teeft.DefaultFilter(worker.resources.parameters.filters.title),
    "fulltext": new teeft.DefaultFilter(worker.resources.parameters.filters.fulltext),
  };
  // Set correct filter for each extractor
  worker.extractors.title.extractor = new teeft.TermExtraction({
    "filter": worker.filters.title
  });
  worker.extractors.title.resources.sort = false;
  worker.extractors.title.resources.truncate = false;
  worker.extractors.fulltext.extractor = new teeft.TermExtraction({
    "filter": worker.filters.fulltext
  });
  worker.extractors.fulltext.resources.sort = worker.resources.sort;
  worker.extractors.fulltext.resources.truncate = worker.resources.truncate;

  worker.LOGS = { // All logs available on this module
    "SUCCESS": "File created at ",
    "ERROR_TERMS": "Selected terms not found"
  };
}

/**
 * Index a fulltext (called by sisyphe)
 * @param {Object} data data of the current docObject
 * @param {Function} next Callback funtion
 * @return {undefined} Asynchronous function
 */
worker.doTheJob = function(data, next) {
  // Check resources are correctly loaded & MIME type of file & file is well formed
  if (!worker.resources || data.mimetype !== worker.resources.parameters.input.mimetype || !data.isWellFormed) {
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
    // Get the keywords exrated by skeeft
    const keywords = worker.index(modsStr, worker.resources.parameters.selectors, worker.resources.parameters.criterion);
    // If there is no term extracted
    if (keywords.length === 0) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.ERROR_TERMS);
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
          "keywords": keywords // Selected keywords
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
        "categories": keywords,
        "output": {
          "path": path.join(output.directory, output.filename),
          "extension": worker.resources.enrichment.extension,
          "original": worker.resources.enrichment.original,
          "mimetype": worker.resources.output.mimetype
        }
      };
      // Save enrichments in data
      data.enrichments = utils.enrichments.save(data.enrichments, {
        "enrichment": {
          enrichment
        },
        "label": worker.resources.module.label
      });
      // All clear
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.SUCCESS + output.filename);
      return next(null, data);
    });
  });
};

/**
 * Index a fulltext (called by sisyphe)
 * @param {String} xmlString Fulltext (XML formated string)
 * @param {Object} selectors Used selectors
 * @param {String} criterion Criterion used (sort)
 * @return {Array} List of extracted keywords
 */
worker.index = function(xmlString, selectors, criterion) {
  const $ = utils.XML.load(xmlString),
    _selectors = {
      "title": selectors.title,
      "segments": {}
    },
    titleWords = worker.extractors.title.extractor.extract(
      worker.extractors.title.lemmatize(
        worker.extractors.title.tagger.tag(worker.extractors.title.tokenize($(selectors.title).text()))
      )
    ), // Get keywords in title (weighting)
    indexations = selectors.segments.map(function(el, i) {
      return $(el).map(function(j, e) {
        // return $(e).text();
        return worker.extractors.fulltext.index($(e).text());
      }).get();
    }), // Get keywords for each parts of fulltext
    data = indexations.map(function(e, i) {
      return e.map(function(f, j) {
        return f.keywords.map(function(g, k) {
          const key = selectors.segments[i] + ":nth-child(" + j + ")",
            cp = extend({
              segment: key
            }, g);
          _selectors.segments[key] = true;
          return cp;
        });
      }).reduce(function(acc, cur) {
        return acc.concat(cur);
      }, []);
    }).reduce(function(acc, cur) {
      return acc.concat(cur);
    }, []), // Regroup keywords
    m = new Matrix(); // Matrix of text representation
  _selectors.segments = Object.keys(_selectors.segments);
  m.init(data, _selectors);
  const filled = m.fill(criterion),
    stats = m.stats(filled),
    select = m.select(stats, titleWords),
    sorted = m.sort(select);
  return sorted
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
    result.template = fs.readFileSync(path.join(folder, result.template), 'utf-8');
  } else {
    result = require("./conf/sisyphe-conf.json");
  }
  return result;
};

module.exports = worker;