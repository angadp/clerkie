/*
 * Templates for testing
 */

const
    MIN_REC_TRANS_NUM = 3, // Minimum number of transactions to be considered recurring
    START_NUM_DAYS = 2, // Number of days to go back when startin the recurring pattern
    uniqid = require("uniqid"),
    testUtil = require("../util.js");

/*
 * Tests monthly recurring transactions
 */
module.exports.testMonthlyRec = async function(userId, companyName, suffixType="PLAIN", transAmt, numTrans=MIN_REC_TRANS_NUM) {
    let date = new Date();
    date.setDate(date.getDate() - START_NUM_DAYS);
    let transPrefix = uniqid();

    let transArr = [];
    for (let i = 0; i < numTrans; i++) {
        transArr.push(testUtil.createTrans(transPrefix, userId, companyName, transAmt, date, true));
        date.setMonth(date.getMonth() - 1);
    }
    
    await runTest(`MONTHLY RECURRING ${suffixType}`, transArr);
}

/*
 * Runs the test by sending the request and doing the necessary tests
 */
async function runTest(testName, transArr) {
    testUtil.sortTransArr(transArr);
    let respPromise = testUtil.addRespListeners();
    let httpResp = await testUtil.sendUpsertReq(transArr);
    let zmqResp = await respPromise;
    if (httpResp) var response = httpResp;
    else var response = zmqResp;
    testUtil.testEquality(testName, response, transArr);
}