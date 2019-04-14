var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Resources = new Schema({
    id: { type: String, unique: true },
    data: [String],
    created: Number,
    modified: Number,
    deleted: Number
});

module.exports = mongoose.model('Resources', Resources);