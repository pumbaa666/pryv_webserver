const config = require('../config/app');

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

/*
 * Database
 */
const sanitize = require('mongo-sanitize'); // Protect db againsts injection
const mongoose = require('mongoose');
const mongoDbUrl = 'mongodb://' + config.database.url + ':' + config.database.port + '/' + config.database.name;
logger.info('Connecting to Database : ' + mongoDbUrl);
mongoose.connect(mongoDbUrl, { useNewUrlParser: true, useCreateIndex: true }); // useCreateIndex : https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&ved=2ahUKEwj01KKn4M_hAhUCKewKHZu3C_EQFjAAegQIBBAB&url=https%3A%2F%2Fgithub.com%2FAutomattic%2Fmongoose%2Fissues%2F6890&usg=AOvVaw1LQ5-k1g-Sr9xz0RQKIKlE
const db = mongoose.connection; //Get the default connection
mongoose.set('useFindAndModify', false); // Don't show deprecation warning : https://github.com/Automattic/mongoose/issues/6880
const UsersModel = require('../models/users')
const ResourcesModel = require('../models/resources')

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
app.use(express.json()); // Parse json object and put them in ithe request.body : https://stackoverflow.com/questions/10005939/how-do-i-consume-the-json-post-data-in-an-express-application

function isUserAutenthicated(req, res) {
	if (res && !req.headers.authorization.success) {
		res.setHeader('Content-Type', 'application/json');
		res.status(401).json({ error: { message: 'You should be connected to do this operation', reason: req.headers.authorization.message } });
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
app.post('/users', function (req, res, next) {
	var user = JSON.parse(req.body.user);
	if (!user || !user.username || !user.password)
		return next({ error: 'Missing username/password' });

	user.password = hash(user.password);

	UsersModel.create(user, function (error, user) {
		if (error)
			return next(error);
		logger.debug('new user created : ' + user);
		return res.status(201).json(user);
	});
});

/*
 * Log the user if he provides a username and a password in a json object.
 * In case of success : return a 48h-valid token
 */
app.post('/auth/login', function (req, res, next) {
	if (!req.body.username || !req.body.password)
		return next({ error: 'Missing username/password' });

	var username = req.body.username;
	var password = hash(req.body.password);

	UsersModel.findOne({ username: username, password: password }, function (error, user) {
		if (error)
			return next(error);
		if (!user)
			return next({ error: 'Bad credentials' });

		// Matching credentials : return token
		var token = jwt.sign({ username: username }, config.token.secret, { expiresIn: '48h' });
		var result = { token: token };
		logger.debug('creating token for user ' + username + ' : ' + token);

		res.setHeader('Content-Type', 'application/json');
		return res.status(200).json(result);
	});
});

/*
 * Show all resources and let user to create new ones.
 * Authentication required.
 */
app.get('/resources', middleware.checkToken, function (req, res, next) {
	if (!isUserAutenthicated(req, res))
		return;

	ResourcesModel.find({}, function (error, resources) {
		if (error)
			return next(error);
		return res.status(200).json(resources);
	});
});

/**
 * Strip array cells length to config.resource.maxCellLength characters maximum.
 * Strip array length to config.resource.maxArrayLength
 * 
 * @param {*} data Array to be striped
 */
function stripDataSize(data) {
	for (var i = 0; i < data.length; i++) {
		if(typeof data[i] === 'string')
			data[i] = sanitize(data[i].substring(0, config.resource.maxCellLength));
		else if(typeof data[i] !== 'number')
			data[i] = "";
	}

	data.length = Math.min(data.length, config.resource.maxArrayLength); // Set maximum length to maxArrayLength
	return data;
}

/*
 * Add a new resource.
 * Authentication required.
 */
app.post('/resource', middleware.checkToken, function (req, res, next) {
	if (!isUserAutenthicated(req, res))
		return;

	if (!req.body.resource)
		return next({ error: 'Missing resource' });

	var resource = JSON.parse(req.body.resource);
	var newResource = new Object();
	if (!resource.id)
		newResource.id = uuidv4();
	else
		newResource.id = sanitize(resource.id);

	if (!resource.data || !resource.data.fields || resource.data.fields <= 0)
		return next({ error: 'One field required' });
	var data = resource.data.fields;
	newResource.data = stripDataSize(data);

	newResource.created = new Date().getTime();
	newResource.modified = newResource.created;

	ResourcesModel.create(newResource, function (error, resource) {
		if (error)
			return next(error);
		res.setHeader('Content-Type', 'application/json');
		logger.debug('new resource created : ' + resource);
		return res.status(201).json(resource);
	});
});

/*
 * Edit data of a resource, providing its id.
 * Authentication required.
 */
app.put('/resource/edit/:id', middleware.checkToken, function (req, res, next) {
	if (!isUserAutenthicated(req, res))
		return;

	if (!req.params.id)
		return next({ error: 'Missing resource id' });

	var id = req.params.id;
	if (!req.body['resource'])
		return next({ error: 'Missing data' });

	var resource = JSON.parse(req.body['resource']);

	if (!resource.data || !resource.data.fields || resource.data.fields <= 0)
		return next({ error: 'One field required' });
	var data = resource.data.fields;
	data = stripDataSize(data);

	var currentTime = new Date().getTime();
	ResourcesModel.findOneAndUpdate({ id: id }, { $set: { data: data, modified: currentTime } }, { new: true }, function (error, resource) {
		if (error)
			return next(error);
		res.setHeader('Content-Type', 'application/json');

		if (!resource)
			return res.status(204).json({ error: "No resource to edit" });

		return res.status(201).json(resource);
	});
});

app.delete('/resource/:id', middleware.checkToken, function (req, res, next) {
	if (!isUserAutenthicated(req, res))
		return;

	if (!req.params.id)
		return next({ error: 'Missing resource id' });

	var id = req.params.id;
	var currentTime = new Date().getTime();

	// Return updated result : https://stackoverflow.com/questions/32811510/mongoose-findoneandupdate-doesnt-return-updated-document
	ResourcesModel.findOneAndUpdate(
		{ id: id, deleted: undefined },
		{ $set: { data: [], modified: currentTime, deleted: currentTime } },
		{ new: true },
		function (error, result) {
			res.setHeader('Content-Type', 'application/json');
			return res.status(200).json(result);
		});
});

function page404(req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.status(404).send({ error: 'Unknown page !' });
}
app.use(page404);

function errorHandler(error, req, res, next) {
	logger.error(error);
	res.setHeader('Content-Type', 'application/json');
	res.status(400).send(error);
}
app.use(errorHandler);

app.listen(config.app.port);
logger.info('Listening on port ' + config.app.port);
module.exports = app; // for testing