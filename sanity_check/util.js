/*
 * Utility functions for running tests
 */

const
    deepDiff = require("deep-diff"),
    assert = require("assert"),
    uniqid = require("uniqid"),
    us = require("underscore"),
    zmq = require("zeromq"),
    REC_ELEM_FIELDS = ["name", "user_id", "next_amt", "next_date", "transactions"], // Which fields to include in the recurring trans elems
    EXC_TRANS_FIELDS = ["recurring_group", "is_recurring"],
    TRANSACTION_KEYS = ["trans_id", "user_id", "name", "amount", "date"],
    // SEND_TYPE = "ZMQ",
    SEND_TYPE = "HTTP",
    SESSION_ID = uniqid(),
    httpRequester = require("request"),
    requester = zmq.socket("req");

/*
 * Connects to the specified server
 */
module.exports.connectToServer = function(connectStr="localhost") {
    if (!connectStr) connectStr = "localhost"; // Use localhost if string is empty
    requester.connect(`tcp://${connectStr}:1984`);
}

/*
 * Creates a single transaction that should be added
 */
module.exports.createTrans = function(transIdPrefix, userId, name, amount, date, isRecurring=false, recGroup="default") {
    return {
        trans_id: transIdPrefix + "::" + uniqid(),
        user_id: SESSION_ID + "-" + userId,
        name: name,
        amount: amount,
        date: new Date(date),
        is_recurring: isRecurring,
        recurring_group: recGroup
    };
}

/*
 * Sorts the transactions array so a proper comparison can be made
 */
let sortTransArr = module.exports.sortTransArr = function(transArr) {
    transArr.sort((a, b) => a.date - b.date);
    return transArr;
}

/*
 * Sends an upsert transaction request to the server
 */
module.exports.sendUpsertReq = function(transArr) {
    return new Promise((resolve, reject) => {
        transArr = JSON.parse(JSON.stringify(transArr));
        removeRecIdentifiers(transArr);
        console.log(`Sending following transactions to server: ${JSON.stringify(transArr)}`);
        let request = transArr;
        if (SEND_TYPE === "ZMQ") {
            requester.send(JSON.stringify(request));
            resolve();
        } else {
            httpRequester.post("http://localhost:1984/", {json: request}, (err, response) => {
                console.log(`Processing HTTP response: ` + JSON.stringify(response));
                if (err) {
                    reject(err);
                } else {
                    processRespData(JSON.stringify(response.body), resolve);
                }
            })
        }
    });
}

/*
* Removes any fields that were used to assist in identifying recurring transactions
*/
function removeRecIdentifiers(transArr) {
    transArr.forEach((trans, index) => transArr[index] = us.omit(trans, EXC_TRANS_FIELDS));
    return transArr;
}

/*
 * Performs an equality test on the 2 passed objects
 */
module.exports.testEquality = function(testName, response, transArr, onlyTestUnit=true) {
    console.log(`\n\n=========================== STARTING TEST: ${testName} ===========================\n`);
    let actualResArr = response;
    let expectedRes = [];
    if (transArr.length) expectedRes = createRecElemsFromTransArr(transArr.filter(elem => elem.is_recurring));
    if (onlyTestUnit) actualResArr = processForUnitTest(actualResArr, transArr); // Only test recurring transactions that involve the given trans arr
    remExFieldsFromRes(actualResArr);

    try {
        console.log(`Actual   : ${JSON.stringify(actualResArr)}`);
        console.log(`Expected : ${JSON.stringify(expectedRes)}`);
        console.log(`Testing for recurring array length...`);
        assert(actualResArr.length === expectedRes.length, "Actual result doesn't have same number of elements as expected result");
        
        expectedRes.forEach(expectedElem => {
            let actualElemIndex = us.findIndex(actualResArr, elem => elem.name === expectedElem.name); // Get the expected element that matches
            if (actualElemIndex === -1) {
                throw Error("Didn't find expected element that matches: " + expectedElem.name);
            } else {
                let actualElem = actualResArr[actualElemIndex];
                checkRecElem(actualElem, expectedElem);
            }
        });
 
        console.log(`--------------------------- PASSED ${testName} ---------------------------`);
    } catch (err) {
        console.log(`Encountered following error in testEquality: ${err.stack}`)
        let diff = deepDiff(actualResArr, expectedRes);
        console.log(`--------------------------- FAILED ${testName} ---------------------------`);
        console.log(`${JSON.stringify(diff)}`);
    }
    console.log(`\n=========================== END TEST ===========================\n\n`);
}

/*
 * Removes any extraneous fields from the result
 */
function remExFieldsFromRes(arr) {
    arr.forEach((elem, index) => {
        arr[index] = us.pick(elem, REC_ELEM_FIELDS);
    })
    return arr;
}

/*
 * Filters the response down to the recurring transactions that are currently being tested
 */
function processForUnitTest(actualRes, transArr) {
    let transIdPrefixSet = new Set();
    transArr.forEach(trans => transIdPrefixSet.add(getTransIdPrefix(trans.trans_id))); // Put all transaction prefixes in the set
    actualRes = actualRes.filter(recElem => {
        let transactions = recElem.transactions;
        let match = us.find(transactions, transElem => {
            let prefix = getTransIdPrefix(transElem.trans_id);
            return transIdPrefixSet.has(prefix);
        });
        return match;
    });
    return actualRes;
}

/*
 * Gets the trans id prefix from the trans id
 */
function getTransIdPrefix(transId) {
    return transId.split("::")[0]
}

/*
 * Checks the actual recurring transaction element to make sure it matches the expected result
 */
function checkRecElem(actualElem, expectedElem) {
    assert(!isNaN(Date.parse(actualElem.next_date)), "Failed next date format test");
    assert(!isNaN(actualElem.next_amt), "Failed next amount format test");
    
    if (actualElem.transactions) sortTransArr(actualElem.transactions); // Make sure the transaction arrays are consistent for the equality check
    if (expectedElem.transactions) sortTransArr(expectedElem.transactions);
    assert.deepStrictEqual(actualElem.transactions, expectedElem.transactions, "Failed transaction array test");
}

/*
 * Creates a recurring trans object from the given transactions
 */
function createRecElemsFromTransArr(transArr) {
    let result = [];
    let recGroups = us.groupBy(transArr, elem => elem.recurring_group);
    Object.keys(recGroups).forEach(groupName => {
        let groupTrans = recGroups[groupName];
        groupTrans = removeRecIdentifiers(groupTrans); // Remove identifiers used to group recurring transactions
        sortTransArr(groupTrans);
        let lastTrans = us.last(groupTrans);
        let groupResult = {
            name: lastTrans.name,
            user_id: lastTrans.user_id,
            transactions: groupTrans
        };
        result.push(groupResult);
    })
    return result;
}

/*
 * Creates a promise for the server's response
 */
module.exports.addRespListeners = function() {
    return new Promise((resolve, reject) => {
        if (SEND_TYPE === "ZMQ") {
            requester.on("message", data => {
                processRespData(data, resolve);
            });
            requester.on("error", err => {
                reject(err);
            });
        } else {
            resolve();
        }
    }); 
}

/*
 * Processes response from the candidate's server
 */
function processRespData(data, resolve) {
    let parsedResp = JSON.parse(data, (key, value) => {
        if (key === "date" || key === "next_date") return new Date(value);
        else return value;
    });
    if (parsedResp) parsedResp = removeExtraTransVars(parsedResp);
    resolve(parsedResp);
}

/*
 * Pulls the curring transactions from the resopnse and filters down to results from the current session
 */
function pullRecTrans(recTransArr) {
    return recTransArr.filter(recElem => recElem.user_id.split("-")[0] === SESSION_ID);
}

/*
 * Removes any extraneous variables from the transaction array of each recurring trans elem
 */
function removeExtraTransVars(recTransArr) {
    recTransArr = pullRecTrans(recTransArr);
    recTransArr.forEach(recElem => { // Remove any extra keys so tests can be run properly
        if (recElem.transactions) {
            recElem.transactions.forEach((trans, index) => {
                let filteredTrans = us.pick(trans, TRANSACTION_KEYS);
                recElem.transactions[index] = filteredTrans;
            });
        }
    });
    return recTransArr;
}
