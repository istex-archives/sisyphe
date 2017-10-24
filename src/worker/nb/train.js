/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/*
  Option précisant la RAM allouée
  --max-old-space-size = 8192

  Paramètres :
  --input       Chemin du fichier contenant les données
  --output      Chemin du fichier de sortie du fichier d'entrainement (au format json)
  --separator   Séparateur entre le label et le texte. Par défault c'est une tabulation. (exemple : --separator=";")
*/

/* Module Require */
const NB = require("./lib/nb.js"),
  parseArgs = require("minimist"),
  process = require("process"),
  path = require("path"),
  lineReader = require("line-reader");

// Command Line arguments
const argv = parseArgs(process.argv.slice(2));

const nb = new NB(argv.proba, true),
  filename = path.basename(argv.input),
  separator = argv.separator || "\t";

console.time("Train" + "-" + filename);
// Lecture du fichier ligne par ligne
lineReader.eachLine(argv.input, function(line, last) {
  const data = line.split(separator);
  // nb.train(data[0], data[1].toLowerCase());
  nb.train(data[0], data[1]);

  if (last) {
    console.timeEnd("Train" + "-" + filename);
    console.time("Save" + "-" + argv.output);
    nb.save(argv.output, function(err) {
      console.timeEnd("Save" + "-" + argv.output);
    });
  }
});