/* global module */
/* jslint node: true */
/* jslint indent: 2 */
"use strict";

/* Module Require */
const teeft = require("./index"),
  stopwords = require("./stopwords.json");

teeft.init({});

const tagged = teeft.tagger.tag(Object.keys(stopwords)),
  lemmatized = teeft.lemmatize(tagged);

let result = {};

for (var i = 0; i < lemmatized.length; i++) {
  result[lemmatized[i].lemma] = false;
}

console.log(JSON.stringify(result));