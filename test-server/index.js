const express = require("express");
const testdata = require("./testdata.json");
const PORT = 3000;

const server = express();

const max = testdata.length;
let sending = true;
let i = 0;

server.get("/acft-data", (req, res) => {
    if (sending) {
        res
            .status(200)
            .setHeader('content-type', 'application/json')
            .setHeader('Access-Control-Allow-Origin', "*")
            .send(JSON.stringify(testdata[i]))
            .end();
        i++
        if (i >= max) i--;
    }
    else {
        res
            .status(200)
            .setHeader('content-type', 'application/json')
            .setHeader('Access-Control-Allow-Origin', "*")
            .send(JSON.stringify({}))
            .end();
    }
})

server.listen(PORT, () => {
    console.log(`test server listening on ${PORT}. http://localhost:${PORT}.`);

    process.stdout.write("> ");
    process.stdin.on("data", data => {
        const str = data.toString().trim();
        if (str == "reset" || str == "reload") {
            i = 0;
            console.log("\x1B[32msuccess\x1B[0m");
        }

        if (str == "get")
            console.log(i);

        if (str == "stop") {
            sending = false;
            console.log("\x1B[31mstopping\x1B[0m")
        }
        if (str == "start") {
            sending = true;
            console.log("\x1B[32mstarting\x1B[0m")
        }


        const args = str.split(" ");
        if (args[0] == "set") {
            const newI = parseInt(args[1]);
            if (isNaN(newI)) return console.log("\x1B[31mfail\x1B[0m");
            if (newI < 0) newI = 0;
            if (newI > max) newI = max;
            i = newI
            console.log("\x1B[32msuccess\x1B[0m");
        }
        process.stdout.write("> ");
    });
});

