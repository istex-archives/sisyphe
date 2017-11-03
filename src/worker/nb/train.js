/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/*
  Required option needed to allow more RAM
  --max-old-space-size = 8192

  Parameters :
  --input       Path to input data (txt file)
  --output      Path to output data (json file)
  --separator   Used separator between label and text. By default : a tabulation. (exemple : ---separator=";")
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
// Read each line of input file
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