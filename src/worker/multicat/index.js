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

  worker.resources = require("multicat-resources");
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

      // Sauvegarde de l"enrichissement dans le data
      data.enrichments = utils.enrichments.save(data.enrichments, {
        "enrichment": enrichment,
        "label": config.label
      });

      // Tout s"est bien passé
      data[pkg.name].logs.push(documentId + "\t" + worker.LOGS.SUCCESS + output.filename);
      return next(null, data);
    });
  });
};

/**
 * Retourne les catégories associés à un Identifier pour une Table donnée
 * @param {String} identifier Identifier à tester
 * @param {String} table Table à tester
 * @return {Array} Tableau contenant les catégories associées à l'Identifier pour cette Table
 */
worker.categorize = function(identifier, table) {
  let result = [];
  if (worker.resources.tables.hasOwnProperty(table) && worker.resources.tables[table].hasOwnProperty(identifier)) {
    const values = worker.resources.tables[table][identifier]; // Contient la liste des catégories rattachées à l"Identifier
    // Ajout de la catégorie à la liste
    if (values) {
      result.push({
        "id": table,
        "values": values
      });
    };
  }

  return result;
};

module.exports = worker;