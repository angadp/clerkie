/*
 * Script to test the user's code
 */

const
    debug = true,
    verbose = true,
    TESTS = ["simple"],
    testUtil = require("./util.js"),
    rl = require("readline-sync");

run()
.then(() => {
    console.log(`Done running test project script...`);
    process.exit(0);
})
.catch(err => {
    if (debug) console.log(`Error when running test project script: ${err.stack}`);  
});

/*
 * Runs the test script
 */
async function run() {
    if (debug && verbose) console.log(`Running run function...`);
    let connectStr = rl.question("What is the IP for the project (leave empty for localhost)? ");
    testUtil.connectToServer(connectStr);
    testModules = TESTS.map(name => require(`./tests/${name}.js`));
    for (let i = 0; i < testModules.length; i++) await testModules[i].run();
}