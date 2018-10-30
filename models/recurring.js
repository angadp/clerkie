var mongoose = require('mongoose');

var recurringSchema = mongoose.Schema({
	transactions:{
		type: Array,
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
	next_amount:{
		type: Number,
		required: true
	},
	next_date:{
		type:Date,
		default:Date.now
	},
	recurring:{
		type:Boolean,
		default:true
	},
	names:{
		type:[String]
	},
	regular_int:{
		type: Number
	}
})

var Recurring = module.exports = mongoose.model('Recurring',recurringSchema);
module.exports.setRecurring = function(arr, callback){
	Recurring.create(arr, callback)
}

module.exports.findAll = async function(callback){
	return await Recurring.find({}).exec()
}