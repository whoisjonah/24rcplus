const express = require("express");
const testdata = require("./testdata.json");
const PORT = 3000;

const server = express();

const max = testdata.length;
let i = 0;

server.get("/acft-data", (req, res) => {
    res
        .status(200)
        .setHeader('content-type', 'application/json')
        .setHeader('Access-Control-Allow-Origin', "*")
        .send(JSON.stringify(testdata[i]))
        .end();
    i++
    if (i >= max) i--;
})

server.listen(PORT, () => {
    console.log(`test server listening on ${PORT}. http://localhost:${PORT}.`);
});