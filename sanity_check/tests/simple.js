/*
 * Simple tests to make sure the most basic criteria have been met
 */

const
    COMPANY_NAME = "Netflix",
    USER_ID = "1",
    SUFFIX_TYPE = "PLAIN",
    templates = require("./templates.js"),
    rl = require("readline-sync");

/*
 * Runs the simplest recurring transactions tests
 */
module.exports.run = async function() {
    console.log(`Running a very simple test to check input/output...`);
    rl.question("Press enter to continue");
    await templates.testMonthlyRec(USER_ID, COMPANY_NAME, SUFFIX_TYPE, 13.99);
}