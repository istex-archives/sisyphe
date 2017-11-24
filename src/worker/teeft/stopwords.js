/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const Teeft = require("./lib/teeft.js"),
  stopwords = require("./stopwords.json");

const teeft = new Teeft(),
  tagged = teeft.tagger.tag(Object.keys(stopwords)),
  lemmatized = teeft.lemmatize(tagged);

let result = {};

for (var i = 0; i < lemmatized.length; i++) {
  result[lemmatized[i].lemma] = true;
}

console.log(JSON.stringify(result));