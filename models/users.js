var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Users = new Schema({
    username: { type: String, unique: true },
    password: String
});

module.exports = mongoose.model('Users', Users);