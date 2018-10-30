const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
var Transactions = require('./models/transactions');
var Recurring = require('./models/recurring');

const app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: false })); // support encoded bodies

mongoose.connect("mongodb://localhost/interview_challenge")


app.listen(1984, function(){
	console.log('Server started on port 1984..')
})

app.get('/', async function(req, res) {
	var re;
	await Recurring.findAll().then(function(resp){re = resp});
	res.status(200).json(re);
});

app.post('/', async function(req, res) {
	var trans = req.body;
	var re;
	await Transactions.setTransactions(trans).then(function(resp) {re = resp});
	res.status(200).json(re);
})