var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Resources = new Schema({
    id: String,
    data: Array,
    created: Number,
    modified: Number,
    deleted: Number
});

module.exports = mongoose.model('Resources', Resources);