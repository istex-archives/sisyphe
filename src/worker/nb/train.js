/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

/*
  Option précisant la RAM allouée
  --max-old-space-size = 8192

  Paramètres :
  --input       Chemin du fichier contenant les données
  --output      Chemin du fichier de sortie du fichier d'entrainement (au format json)
  --separator   Séparateur entre le label et le texte. Par défault c'est une tabulation. (exemple : --separator=";")
*/

/* Module Require */
var NB = require('./lib/nb.js'),
  parseArgs = require('minimist'),
  process = require('process'),
  path = require('path'),
  lineReader = require('line-reader');

// Command Line arguments
var argv = parseArgs(process.argv.slice(2));
console.log(argv);

var nb = new NB(argv.proba),
  filename = path.basename(argv.input),
  separator = argv.separator || '\t';

console.time('Train' + '-' + filename);
// Lecture du fichier ligne par ligne
lineReader.eachLine(argv.input, function(line, last) {
  var data = line.split(separator);
  nb.train(data[0], data[1]);

  if (last) {
    console.timeEnd('Train' + '-' + filename);
    console.time('Save' + '-' + filename);
    nb.save(argv.output, function(err) {
      console.timeEnd('Save' + '-' + filename);
    });
  }
});