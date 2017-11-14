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
  .option(
    "-t, --thread <number>",
    "The number of process which sisyphe will take"
  )
  .option(
    "-r, --remove-module <name>",
    "Remove module name from the workflow",
    appender(),
    []
  )
  .option("-q, --quiet", "Silence output", false)
  .option("-l, --list", "List all available workers", false)
  .parse(process.argv);

let workers = require(path.resolve(__dirname, "src", "worker.json")).workers;
if (program.list) {
  console.log("List of available workers");
  workers.map(worker => {
    console.log(`  => ${worker}`);
  });
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
    return console.log(
      "please reformat --select: <moduleName>,<moduleName>,..."
    );
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
    if (
      inputWorkers[i] === workersConf[0] ||
      inputWorkers[i] === workersConf[1] ||
      inputWorkers[i] === workersConf[workersConf.length - 1]
    ) {
      inputWorkers.splice(i, 1);
    }
  }
  workers = [
    workersConf[0],
    workersConf[1],
    ...inputWorkers,
    workersConf[workersConf.length - 1]
  ];
}
if (program.removeModule) {
  workers = workers.filter(obj => {
    return !program.removeModule.includes(obj);
  });
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
  outputPath: path.resolve(`./out`, now.toString() + "-" + program.corpusname),
  workers,
  silent: program.quiet
};

/*****************/
/* Launch Sisyphe*/
/*****************/
sisyphe
  .init(session)
  .then(() => {
    return sisyphe.launch();
  })
  .catch(err => {
    console.log(err);
    monitoring.updateError(err);
  });

// Uses to filter workers
function appender(xs) {
  xs = xs || [];
  return function(x) {
    xs.push(x);
    return xs;
  };
}

// /****************/
// /* Manage error */
// /****************/
// //do something when app is closing
// process.on("exit", exitHandler.bind(null, { exit: true }));
// //catches ctrl+c event
// process.on("SIGINT", exitHandler.bind(null, { exit: true }));
// // catches normal exit event
// process.on("SIGTERM", exitHandler.bind(null, { exit: true }));
// // catches "kill pid" (for example: nodemon restart)
// process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
// process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));
// //catches uncaught exceptions
// process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
