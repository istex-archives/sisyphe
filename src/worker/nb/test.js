/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/*
  Option précisant la RAM allouée
  --max-old-space-size = 8192

  Paramètres :
  --input       Chemin du fichier contenant les données
  --output      Chemin du fichier de sortie du fichier de test (au format json)
  --separator   Séparateur entre le label et le texte. Par défault c'est une tabulation. (exemple : --separator=";")
*/

/* Module Require */
const nb = require("./index.js"),
  parseArgs = require("minimist"),
  process = require("process"),
  path = require("path"),
  fs = require("fs"),
  lineReader = require("line-reader");

// Command Line arguments
const argv = parseArgs(process.argv.slice(2));

const filename = path.basename(argv.input),
  separator = argv.separator || "\t";

let results = [];

console.time("Test" + "-" + filename);
// Lecture du fichier ligne par ligne
lineReader.eachLine(argv.input, function(line, last) {
  const data = line.split(separator);
  // let res = data[0] + ";" + nb.categorize(data[1].toLowerCase()).categories.map((el) => {
  let res = data[0] + ";" + nb.categorize(data[1]).categories.map((el) => {
    return el.code + ";" + el.probability + ";";
  });
  results.push(JSON.stringify(res));
  if (last) {
    console.timeEnd("Test" + "-" + filename);
    console.time("Write" + "-" + argv.output);
    fs.writeFile(argv.output, results.join("\n"), function(err) {
      console.timeEnd("Write" + "-" + argv.output);
    });
  }
});