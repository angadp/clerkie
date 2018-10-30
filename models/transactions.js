var mongoose = require('mongoose');
var recurring = require('./recurring.js');

var transactionSchema = mongoose.Schema({
	trans_id:{
		type: String,
		required: true
	},
	user_id:{
		type: String,
		required: true
	},
	name:{
		type: String,
		required: true
	},
	amount:{
		type: Number,
		required: true
	},
	date:{
		type: Date,
		default:Date.now
	},
	names:{
		type: [String]
	}
})

var Transaction = module.exports = mongoose.model('Transaction',transactionSchema);


module.exports.setTransactions = async function(arr, callback){
	arr.sort(function (a, b) {
	return a.date.localeCompare(b.date);
	});
	var len = arr.length;
	console.log(arr)
	for(var i=0;i<len;i++){
		var name = arr[i].name
		var user_id = arr[i].user_id
		arr[i].date = new Date(arr[i].date)
		arr[i].names = []
		naarr = name.split(" ")
		var le = naarr.length
		var ne = name.split(" ")
		for(var j = le; j>0; j--)
		{
			var ne = ne.splice(0,j)
			arr[i].names.push(ne.join(" "))
		}
		var near = name.split(" ")
		for(var j = le; j>0; j--)
		{
			var near = near.splice(0,j)
			var query = {
    			user_id: user_id,
    			names: near.join(" ")
			};
			//console.log(query)
			//Already recurring charge
			var rec = await recurring.find(query).exec();
			if(rec.length == 1)
			{
				if(Math.abs(rec[0].next_date - arr[i].date)<=14*24*60*60*1000)
				{
					var new_rec = rec[0]
					new_rec.next_date = new Date((rec[0].next_date.getTime() + new_rec.regular_int));
					new_rec.recurring = true
					new_rec.transactions.push(arr[i])
					await recurring.update({_id: new_rec._id}, new_rec, function(err, raw) {
					    if (err) {
					      res.send(err);
					    }
					});
				}
				else
				{
					var new_rec = rec[0]
					new_rec.recurring = false;
					new_rec.transactions.push(arr[i])
					await recurring.update({_id: new_rec._id}, new_rec, function(err, raw) {
					    if (err) {
					      res.send(err);
					    }
					});
				}
				break;
			}
			else{
				var trans = await Transaction.find(query).exec();
				//New recurring cost
				if(trans.length == 1)
				{
					var newrecurring = new recurring;
					newrecurring.next_amount = arr[i].amount;
					newrecurring.next_date = new Date((arr[i].date.getTime() + (arr[i].date - trans[0].date)));
					newrecurring.transactions = []
					newrecurring.regular_int = (arr[i].date - trans[0].date)
					newrecurring.transactions.push(trans[0])
					newrecurring.transactions.push(arr[i])
					newrecurring.name = near.join(" ")
					newrecurring.names = arr[i].names
					newrecurring.user_id = user_id
					recurring.setRecurring(newrecurring, function(err, trans){
						if(err){
							throw err;
						}
					})
					break
				}
			}
		}
		await Transaction.create(arr[i])
	}
	return recurring.findAll()
}