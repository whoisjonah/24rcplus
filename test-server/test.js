// Extract all aircraft-data from har for replay

const har = require("./har.json");
const fs = require("fs");

const acftsdatas = har.log.entries.filter(
    entry => 
        entry.request.url.endsWith("/aircraft-data") &&
        entry.request.method === "GET"
).map(
    entry => entry.response.content.text
);


const writestream = fs.createWriteStream('./testdata.json');

writestream.write("[\n")
for (let i = 0; i < acftsdatas.length; i++) {
    if (i != 0) 
        writestream.write(",\n")
    writestream.write("    ")
    writestream.write(acftsdatas[i]);
}
writestream.write("\n]\n");
writestream.close();