const config = require('./config');

/*
 * Logger
 */
var log4js = require('log4js');
log4js.configure('./config/log4js.json');
var logger = log4js.getLogger('app');

/*
 * Web
 */
const express = require('express');
const bodyParser = require('body-parser'); // Handle parameters in POST 
const urlencodedParser = bodyParser.urlencoded({ extended: false });

/*
 * Database
 */
const MongoClient = require('mongodb').MongoClient;
const mongoDbUrl = 'mongodb://'+config.database.url+':'+config.database.port;
const dbName = config.database.name;
const sanitize = require('mongo-sanitize'); // Protect db againsts injection

/*
 * JWT
 */
const jwt = require('jsonwebtoken');
const middleware = require('./middleware');

/*
 * Divers
 */
const crypto = require('crypto');
const uuidv4 = require('uuid/v4'); // Generate UUID. v4 means Random

var app = express();
app.use(express.static('scripts')); // Serves static files. Used in ./views/*.ejs files to include ./scripts/*.js

function isUserAutenthicated(req, res) {
	if (res && !req.headers.authorization.success) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(401).send('You should be connected to do this operation. ' + req.headers.authorization.message);
	}

	return req.headers.authorization.success;
}

/*
 * Hash a string using sha256
 */
function hash(string) {
	return crypto.createHash('sha256').update(string, 'utf8').digest(); 
}

/*
 * Create user if username and password are set in the body.
 * The payload is JSON.
 * No authentication required.
 */
app.post('/users',  urlencodedParser, function(req, res) {
	var user = JSON.parse(req.body.js_user);
	if(!user || !user.username || !user.password) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('Missing username/password');
		return;
	}
	logger.debug('req.psw = '+user.password);
	user.password = hash(user.password);
	logger.debug('psw = '+user.password);

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Users');
		col.insertOne(user, function(err, result) {
			logger.debug('new user inserted : '+JSON.stringify(user));
			client.close();
			res.status(201).json(user);
			return;
		});
	});
});

/*
 * Log the user if he provides a username and a password in a json object.
 * In case of success : stores a authentication token in the session.
 */
app.post('/auth/login', urlencodedParser, function(req, res) {
	logger.debug('--- Login ---');
	if(!req.body.username || !req.body.password) {
		res.status(400).send('Missing username/password');
		return;
	}
	logger.debug('req.username = '+req.body.username + ' / req.psw = '+req.body.password)
	var username = req.body.username;
	var password = hash(req.body.password);
	logger.debug('username = '+username + ' / psw = '+password)

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if (err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Users');
		col.findOne({ username: username, password: password }, function (err, user) {
			if (user) { // Matching credentials : put token from jwt in the session and redirect user to index
				res.setHeader('Content-Type', 'application/json');

				var token = jwt.sign({ username: username }, config.token.secret, { expiresIn: '48h' });
				logger.debug('token : ' + token);

				res.status(200).json(token);
				return;
			}

			res.setHeader('Content-Type', 'text/plain');
			res.status(400).send('Bad credentials !');
			return;
		});
	});
});

/*
 * Show all resources and let user to create new ones.
 * Authentication required.
 */
app.get('/resources', middleware.checkToken, function(req, res) {
	if(!isUserAutenthicated(req, res))
		return;

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const resources_col = db.collection('Resources');
		resources_col.find({}).toArray(function(err, resources) {
			client.close();
			// res.setHeader('Content-Type', 'text/html');
			// res.render('resources.ejs', {resources:resources, logged: isUserAutenthicated(req, false)});
			res.status(200).json(resources);
		});
	});
});

/*
 * Add a new resource.
 * Authentication required.
 */
app.post('/resource', middleware.checkToken, urlencodedParser, function(req, res) {
	if(!isUserAutenthicated(req, res))
		return;

	if (!req.body.js_resource) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('Missing resource');
		return;
	}

	var resource = JSON.parse(req.body.js_resource);
	var newResource = new Object();
	if(!resource.id)
		newResource.id = uuidv4();
	else
		newResource.id = sanitize(resource.id);

	if(!resource.data){
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('One field required');
		return;
	}

	var data = resource.data;
	if(data.length <= 0) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('One field required');
		return;
	}

	// Limit data size to 512 char maximum
	for(var i = 0; i < data.length; i++)
		data[i] = sanitize(data[i].substring(0, 512));
	newResource.data = data;

	newResource.created = new Date().getTime();
	newResource.modified = newResource.created;

	// Insert into DB
	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Resources');
		col.insertOne(newResource, function(err, r) {
			res.setHeader('Content-Type', 'application/json');
			res.status(201).json(newResource);
			client.close();
			return;
		});
	});
});

/*
 * Edit data of a resource, providing its id.
 * Authentication required.
 */
app.put('/resource/edit/:id', middleware.checkToken, urlencodedParser, function(req, res) {
	if(!isUserAutenthicated(req, res))
		return;

	logger.debug('--- Resource Edit ---');
	logger.debug('id : '+req.params.id);
	if(!req.params.id) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('Missing resource id');
		return;
	}

	logger.debug('js_resource : '+req.body.js_resource);
	var id = req.params.id;
	if(!req.body['js_resource']) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('Missing data');
		return;
	}

	var js_resource = req.body['js_resource'];
	var resource = JSON.parse(js_resource);
	var data = resource.data;
	logger.debug('data : '+data);

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Resources');
		var currentTime = new Date().getTime();
		col.findOneAndUpdate({id: id}, {$set: {data: data, modified: currentTime}}, {returnOriginal:false}, function(err, result) {
			res.setHeader('Content-Type', 'application/json');
			client.close();

			logger.debug("err : "+JSON.stringify(err));
			if(err) {
				res.json(err);
				return;
			}

			logger.debug("result.value : "+JSON.stringify(result.value));
			if(!result.value) {
				res.status(204).json({error: "No resource to edit"});
				return;
			}

			res.status(201).json(result.value);
			return;
		});
	});
});

app.delete('/resource/:id', middleware.checkToken, function(req, res) {
	if(!isUserAutenthicated(req, res))
		return;

	if(!req.params.id) {
		res.setHeader('Content-Type', 'text/plain');
		res.status(400).send('Missing resource id');
		return;
	}

	var id = req.params.id;
	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Resources');
		var currentTime = new Date().getTime();

		col.findOneAndUpdate({id: id, deleted:undefined}, {$set: {data: [], modified: currentTime, deleted: currentTime}}, {returnOriginal:false}, function(err, result) {
			res.setHeader('Content-Type', 'application/json');
			client.close();
			res.status(200).json(result.value);
			return;
		});
	});
});

/*
 * Page 404
 */
app.use(function(req, res, next){
		res.setHeader('Content-Type', 'text/plain');
		res.status(404).send('Unknown page !');
});

app.listen(config.app.port);
logger.info('Listening on port '+config.app.port);
module.exports = app; // for testing