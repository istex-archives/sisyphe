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

worker.init = (options = {
  corpusname: "default"
}) => {
  worker.outputPath = options.outputPath || path.join("out/", pkg.name);

  worker.resources = worker.load(path.join(configDir, configFilename));
  /* Constantes */
  worker.NOW = utils.dates.now(); // Date du jour formatée (String)
  worker.LOGS = { // Logs des différents cas possibles (et gérés par le module)
    "SUCCESS": "TEI file created at ",
    "IDENTIFIER_NOT_FOUND": "IDENTIFIER not found",
    "IDENTIFIER_DOES_NOT_MATCH": "IDENTIFIER does not match any category"
  };
}

/*
 ** ------------------------------------------------------------------------------
 ** Coeur du Code Métier
 ** ------------------------------------------------------------------------------
 */
worker.doTheJob = function(data, next) {

  // Vérification du type de fichier
  if (data.mimetype !== "application/xml" || !data.isWellFormed) {
    return next(null, data);
  }

  // Variables d'erreurs et de logs
  data[pkg.name] = {
    errors: [],
    logs: []
  };

  // Récupération des données utiles
  const documentId = path.basename(data.name, ".xml");

  // Lecture du fichier MODS
  fs.readFile(data.path, "utf-8", function(err, modsStr) {

    // Lecture impossible
    if (err) {
      data[pkg.name].errors.push(err.toString());
      return next(null, data);
    }

    // Récupération de l'identifier
    const $ = utils.XML.load(modsStr);
    let categories = [];

    for (let i = 0, l = worker.resources.categorizations.length; i < l; i++) {

      const identifier = $(worker.resources.categorizations[i].identifier).text();

      // Identifier introuvable
      if (!identifier) {
        data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.IDENTIFIER_NOT_FOUND);
        return next(null, data);
      }

      // Récupération des catégories qui correspondent à l'identifier
      categories = categories.concat(worker.categorize(identifier, worker.resources.categorizations[i].id));
    }
    // Pas de catégorie correspondante
    if (!categories.length) {
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.IDENTIFIER_DO_NOT_MATCH);
      return next(null, data);
    }

    // Construction de la structure de données pour le template
    const tpl = {
        "date": worker.NOW,
        "module": config, // Infos sur la configuration du module
        "pkg": pkg, // Infos sur la configuration du module
        "document": { // Infos sur le document
          "id": documentId,
          "categories": categories
        },
        categorizations: worker.resources.categorizations // Infos sur les catégorisations utilisées
      },
      // Récupération du directory & filename de l"ouput
      output = utils.files.createPath({
        outputPath: worker.outputPath,
        id: documentId,
        type: "enrichments",
        label: pkg.name,
        // extension: ["_", config.version, "_", config.training, ".tei.xml"].join(")
        extension: ".tei.xml"
      });

    // Récupération du fragment de TEI
    utils.enrichments.write({
      "template": worker.resources.template,
      "data": tpl,
      "output": output
    }, function(err) {

      // Lecture/Écriture impossible
      if (err) {
        data[pkg.name].errors.push(err.toString());
        return next(null, data);
      }

      // Création de l"objet enrichement représentant l'enrichissement produit
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
 * @param {String} filename Path of sisyphe config file
 * @return {Object} An object containing all the data loaded
 */
worker.load = (filename) => {
  const result = require(filename);
  for (let i = 0; i < result.categorizations.length; i++) {
    result.tables[result.categorizations[i].id] = require(path.join(__dirname, result.categorizations[i].file));
  }
  result.template = fs.readFileSync(result.template, 'utf-8');
  return result;
};

module.exports = worker;