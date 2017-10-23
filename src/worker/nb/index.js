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
  config = require("./config.json"),
  pkg = require("./package.json"),
  NB = require("./lib/nb.js");

const business = {
  "resources": require("nb-resources")
};

business.init = (options = {
  corpusname: "default"
}) => {
  business.outputPath = options.outputPath || path.join("out/", pkg.name);
  /* Constantes */
  business.LOGS = { // Logs des différents cas possibles (et gérés par le module)
    "SUCCESS": "TEI file created at ",
    "ABSTRACTS_NOT_FOUND": "Abstracts not found",
    "ABSTRACT_TAG_LANG_NOT_FOUND": "Abstract with correct tag lang not found",
    "ABSTRACT_DETECTED_LANG_NOT_FOUND": "Abstract with correct detected lang not found",
    "CATEGORY_NOT_FOUND": "Category not found",
    "VERBALIZATION_NOT_FOUND": "Verbalization not found"
  };
}

business.doTheJob = (data, next) => {
  // Vérification du type de fichier
  if (data.mimetype !== "application/xml" || !data.isWellFormed) {
    return next(null, data);
  }

  // Variables d"erreurs et de logs
  data[pkg.name] = {
    errors: [],
    logs: []
  };

  const documentId = path.basename(data.name, ".xml");

  // Lecture du fichier MODS
  fs.readFile(data.path, "utf-8", function(err, modsStr) {

    // Lecture impossible
    if (err) {
      data[pkg.name].errors.push(err);
      return next(null, data);
    }

    // Récupération de l"ISSN
    const $ = utils.XML.load(modsStr),
      abstract = $("abstract[lang=\"" + config.lang + "\"]").text();
    let abstracts = [];

    // Abstract introuvable malgrès la détection de langue
    if (!abstract) {
      data[pkg.name].logs.push(documentId + "\t" + business.LOGS.ABSTRACT_TAG_LANG_NOT_FOUND);
      abstracts = $("abstract").map(function(i, el) {
        return $(el).text();
      }).get();
      // Abstracts introuvables
      if (!abstracts.length) {
        data[pkg.name].logs.push(documentId + "\t" + business.LOGS.ABSTRACTS_NOT_FOUND);
        return next(null, data);
      }
    }

    // Pour chaque abstract trouvé (sans la langue voulue)
    async.eachSeries(abstracts, function(item, callback) {
      cld.detect(item, {
        isHTML: false,
        encodingHint: "UTF8",
      }, function(err, result) {
        if (err) return callback(err);
        if (!result) return callback();
        if (result.reliable && result.languages.length) {
          if (result.languages[0].percent >= config.cld.percent && result.languages[0].code === config.cld.code) abstract = item;
        }
        callback();
      });
    }, function(err) {
      if (err) {
        data[pkg.name].errors.push(err);
        return next(null, data);
      }

      // Abstract introuvable malgrès la détection de langue
      if (!abstract) {
        data[pkg.name].logs.push(documentId + "\t" + business.LOGS.ABSTRACT_DETECTED_LANG_NOT_FOUND);
        return next(null, data);
      }

      // Résultat de la catégorisation
      const result = business.categorize(abstract);


      // Récupération des catégories et des erreurs de verbalisation
      const categories = result.categories,
        errors = result.errors;

      // Si une ou plusieur erreur de verbalisation ont eu lieu, écriture dans les logs
      if (errors.length) data[pkg.name].logs.push(documentId + "\t" + business.LOGS.VERBALIZATION_NOT_FOUND + " (" + result.errors.join(",") + ")");

      // Aucune catégorie déduite
      if (!categories.length) {
        data[pkg.name].logs.push(documentId + "\t" + business.LOGS.CATEGORY_NOT_FOUND);
        return next(null, data);
      }

      business.NOW = utils.dates.now(); // Date du jour formatée (string)
      // Construction de la structure de données pour le template
      const tpl = {
          "date": business.NOW,
          "module": config, // Infos sur la configuration du module
          "pkg": pkg, // Infos sur le module
          "document": { // Infos sur le document
            "id": documentId,
            "categories": categories
          }
        },
        // Récupération du directory & filename de l"ouput
        output = utils.files.createPath({
          outputPath: business.outputPath,
          id: documentId,
          type: "enrichments",
          label: pkg.name,
          // extension: ["_", config.version, "_", config.training, ".tei.xml"].join(")
          extension: ".tei.xml"
        });

      // Récupération du fragment de TEI
      utils.enrichments.write({
        "template": path.join(business.resources.template),
        "data": tpl,
        "output": output
      }, function(err) {
        if (err) {
          // Lecture/Écriture impossible
          data[pkg.name].errors.push(err);
          return next(null, data);
        }

        // Création de l"objet enrichement représentant l"enrichissement produit
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
        data[pkg.name].logs.push(documentId + "\t" + business.LOGS.SUCCESS + output.filename);
        return next(null, data);
      });
    });
  });
};

/**
 * Retourne les catégories calculées par le Bayésien Naïf
 * @param {string} text Texte à classer
 * @return {array} Tableau contenant les catégories calculées
 */
business.categorize = (text) => {
  // Instanciation d"un Bayésien Naïf
  const nb = new NB(config.probability.min),
    categories = [],
    errors = [];
  let training = business.resources.trainings.entry,
    level = 0,
    next = true;
  // Guess de la catégorie tant qu"un entrainement est dispo
  while (next) {
    nb.load(training); // Estimation de la catégorie
    let result = nb.guess(text); // Estimation de la catégorie
    if (result.category) {
      // Verbalisation du code
      const verbalization = business.resources.verbalization[result.category];
      if (!verbalization) errors.push(result.category);
      // Ajout du résultat à la liste
      categories.push({
        "code": result.category,
        "probability": result.probability,
        "verbalization": business.resources.verbalization[result.category],
        "level": ++level // On augmente le niveau de catégorisation
      });
    }
    next = business.resources.trainings.hasOwnProperty(result.category); // Si la clé du prochain entrainement existe => true, sinon false
    if (next) {
      training = business.resources.trainings[result.category]; // Définition du prochain entrainement
    }
  }
  return {
    categories: categories,
    errors: errors
  };
};

module.exports = business;