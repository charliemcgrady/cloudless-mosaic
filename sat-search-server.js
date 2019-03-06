/**
 * sat-search-server.js is an express server which makes it easy to select satellite images
 * 
 * @requires ./results.json - a Feature collection 
 */

const express = require("express");
const fs = require("fs");

const app = express();
const port = 3000;

/** bodyParser is middleware which parses the input to express APIs */
const bodyParser = require('body-parser');
app.use(bodyParser.text({ type: '*/*' }));

/** executeCommand is used to synchronously execute shell commands from Node */
const execSync = require('child_process').execSync;
const executeCommand = command => execSync(command, { encoding: 'utf-8', stdio: 'inherit' })

/** 
 * Get the runId the input parameters
 * 
 * For `node sat-search-server.js nile`
 * 
 * process.argv = [
 *  0: node,
 *  1: sat-search-server.js
 *  2: nile
 * ]
 * 
 * runId = nile
 */
const runId = process.argv[2];

const outputDir = `./output/${runId}`;
fs.mkdirSync(outputDir, { recursive: true });

/** Vend the results from the `sat-search` api */
app.get("/results", (req, res) =>
  res.send(fs.readFileSync(`./results.json`, "utf8"))
);

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

/** Kick off a download of the scenes selected by the user */
app.post("/saveResults", (req, res) => {
  fs.writeFileSync(`${outputDir}/filtered-results.json`, req.body);
  executeCommand(`sat-search load ${outputDir}/filtered-results.json --download ALL -v 4`);
  console.log("Download complete!");
});

app.listen(port, () => console.log(`Sat search server listening on port ${port}!`));
