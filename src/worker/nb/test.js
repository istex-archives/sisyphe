/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/*
  Required option needed to allow more RAM
  --max-old-space-size = 8192

  Parameters :
  --input       Path to input data (txt file)
  --output      Path to output data (csv file)
  --separator   Used separator between label and text. By default : a tabulation. (exemple : ---separator=";")
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
// Read each line of input file
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