#!/usr/bin/env node

"use strict";

const bluebird = require("bluebird");
const program = require("commander");
const pkg = require("./package.json");
const path = require("path");
const numCPUs = require("os").cpus().length;
const sisyphe = require("./sisyphe");

/********************************************/
/* Receive and format command line argument */
/********************************************/
program
  .version(pkg.version)
  .usage("[options] <path>")
  .option("-n, --corpusname <name>", "Corpus name", "default")
  .option("-s, --select <name>", "Select all module to deal with")
  .option("-c, --config-dir <path>", "Configuration folder path")
  .option("-t, --thread <number>", "The number of process which sisyphe will take")
  .option("-r, --remove-module <name>", "Remove module name from the workflow", appender(), [])
  .option("-q, --quiet", "Silence output", false)
  .option("-l, --list", "List all available workers", false)
  .parse(process.argv);

let workers = require(path.resolve(__dirname, "src", "worker.json")).workers;

if (program.list) {
  console.log("List of available workers");
  workers.map(worker => console.log(`  => ${worker}`));
  console.log("Default order:");
  console.log("--select", workers.toString());
  process.exit(0);
}

// Corpusname is default, we stop here
if (program.corpusname === "default" || program.configDir === "none") {
  program.outputHelp();
  process.exit(0);
}

if (program.select) {
  const inputWorkers = program.select.split(",");
  if (!inputWorkers.length)
    return console.log("please reformat --select: <moduleName>,<moduleName>,...");
  if (program.removeModule.length) {
    console.log("Error: --select and --remove are incompatible");
    process.exit(0);
  }
  const workersConf = workers;
  for (var i = 0; i < inputWorkers.length; i++) {
    if (!workersConf.includes(inputWorkers[i])) {
      console.log(`${inputWorkers[i]} doesn't exist`);
      process.exit(0);
    }
    if (inputWorkers[i] === workersConf[0]) inputWorkers.splice(i, 1);
  }
  workers = [workersConf[0], ...inputWorkers];
}
if (program.removeModule) 
  workers = workers.filter(obj => !program.removeModule.includes(obj));


let debugMod = false
let debugPort = null;
for (let arg of process.execArgv) {
  if (arg.includes("inspect") || arg.includes("debug")) {
    debugMod = true;
    debugPort = parseInt(arg.split("=")[1]) || null;
    break;
  }
}

/***************************/
/* Build configuration file*/
/***************************/
const now = Date.now();
const session = {
  corpusname: program.corpusname,
  configDir: program.configDir ? path.resolve(program.configDir) : null,
  inputPath: path.resolve(program.args[0]),
  numCPUs: program.thread || numCPUs,
  now,
  debugMod,
  debugPort,
  outputPath: path.resolve(`./out`, now.toString() + "-" + program.corpusname),
  workers,
  silent: program.quiet
};

/*****************/
/* Launch Sisyphe*/
/*****************/
sisyphe
  .init(session)
  .then(() => sisyphe.launch())
  .catch(err => console.log(err));

// Uses to filter workers
function appender(xs) {
  xs = xs || [];
  return function(x) {
    xs.push(x);
    return xs;
  };
}