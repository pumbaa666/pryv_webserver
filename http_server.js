const config = require('./config');

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
const ObjectId = require('mongodb').ObjectId;
const mongoDbUrl = 'mongodb://'+config.db_url+':'+config.db_port;
const dbName = config.db_name;
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
const session = require('express-session');
const uuidv4 = require('uuid/v4'); // Generate UUID. v4 means Random

var app = express();
app.use(express.static('scripts')); // Serves static files. Used in ./views/*.ejs files to include ./scripts/*.js
app.use(session({secret: config.session_secret,
		 resave: false,
		 saveUninitialized: false}));

/*
 * Intercept every query, put the session token (if any)
 * in the request header and send the query to the next handler
 */
app.use(function (req, res, next) {
	if(!req.headers.authorization)
		req.headers.authorization = {};
	req.headers.authorization.token = req.session.token;
	next();
});

function isUserAutenthicated(req) {
	return req.headers.authorization.token.success;
}

/*
 * Index
 * Show all users from DB.
 * Allow to create new users for free !
 * No authentication required.
 */
app.get('/', middleware.checkToken, function(req, res){
	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const users_col = db.collection('Users');
		users_col.find({}).toArray(function(err, users) {
			res.setHeader('Content-Type', 'text/html');
			res.render('index.ejs', {users:users, logged: isUserAutenthicated(req)});
		});
		client.close();
		return;
	});
});

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
	user.password = hash(user.password);

	if(user._id)
		user._id = ObjectId(user._id);

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Users');
		col.insertOne(user, function(err, r) {
			res.writeHead(302, {'Location': '/'});
			res.end();
			client.close();
			return;
		});
	});
});

/*
 * Delete user given the id.
 * No authentication required.
 */
app.get('/user/delete/:id', function(req, res) {
	if(!req.params.id) {
		res.writeHead(302, {'Location': '/'});
		res.end();
		return;
	}

	var id = req.params.id;
	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Users');
		col.findOneAndDelete({_id: ObjectId(id)}, function(err, r) { // TODO find secure way to create ObjectId
			client.close();
			res.writeHead(302, {'Location': '/'});
			res.end();
			return;
		});
	});
});

/*
 * Log the user if he provides a username and a password in a json object.
 * In case of success : stores a authentication token in the session.
 */
app.post('/auth/login', urlencodedParser, function(req, res) {
	if(!req.body.username || !req.body.password) {
		res.status(400).send('Missing username/password');
		return;
	}
	var username = req.body.username;
	var password = hash(req.body.password);

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
			if(err) throw err;
			const db = client.db(dbName);
			const col = db.collection('Users');
			col.findOne({username: username, password: password}, function(err, user) {
			if(user) { // Matching credentials : put token from jwt in the session and redirect user to index
				var token = jwt.sign({username: username}, config.token_secret, { expiresIn: '48h'});
				req.session.token = token;
				req.session.username = username;

				res.writeHead(302, {'Location': '/'});
				res.end();
				return;
			}

			// Bad credentials : destroy session
			req.session.destroy();
			res.setHeader('Content-Type', 'text/html');
			res.status(400).send('Bad credentials !');
			return;
		});
	});
});

/*
 * Logout and return to index
 */
app.get('/auth/logout', function(req, res) {
	req.session.destroy();
	res.writeHead(302, {'Location': '/'});
	res.end();
});

/*
 * Show all resources and let user to create new ones.
 * Authentication required.
 */
app.get('/resources', middleware.checkToken, function(req, res) {
	if(!isUserAutenthicated(req)) {
		res.setHeader('Content-Type', 'text/html');
		res.status(401).send('You should be connected to do this operation');
		return;
	}

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const resources_col = db.collection('Resources');
		resources_col.find({}).toArray(function(err, resources) {
			res.setHeader('Content-Type', 'text/html');
			res.render('resources.ejs', {resources:resources, logged: isUserAutenthicated(req)});
		});
		client.close();
	});
});

/*
 * Add a new resource.
 * Authentication required.
 */
app.post('/resource', middleware.checkToken, urlencodedParser, function(req, res) {
	if(!isUserAutenthicated(req)) {
		res.setHeader('Content-Type', 'text/html');
		res.status(401).send('You should be connected to do this operation');
		return;
	}

	if (!req.body.js_resource) {
		res.setHeader('Content-Type', 'text/html');
		res.status(400).send('Missing resource');
		return;
	}

	var resource = JSON.parse(req.body.js_resource);
	var newResource = new Object();
	var id;
	if(!resource.id)
		newResource.id = uuidv4();
	else
		newResource.id = sanitize(resource.id);

	if(!resource.data){
		res.setHeader('Content-Type', 'text/html');
		res.status(400).send('One field required');
		return;
	}

	var data = resource.data;
	if(data.length <= 0) {
		res.setHeader('Content-Type', 'text/html');
		res.status(400).send('Il faut au moins un champ');
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
			res.writeHead(302, {'Location': '/resources'});
			res.end();
			client.close();
			return;
		});
	});
});

/*
 * Edit data of a resource, providing its id.
 * Authentication required.
 */
app.post('/resource/edit/:id', middleware.checkToken, urlencodedParser, function(req, res) {
	if(!isUserAutenthicated(req)) {
		res.setHeader('Content-Type', 'text/html');
		res.status(401).send('You should be connected to do this operation');
		return;
	}

	if(!req.params.id) {
		res.setHeader('Content-Type', 'text/html');
		res.status(400).send('Missing resource id');
		return;
	}

	var id = req.params.id;
	if(!req.body['js_resource_'+id]) {
		res.setHeader('Content-Type', 'text/html');
		res.status(400).send('Missing data');
		return;
	}

	var js_resource = req.body['js_resource_'+id];
	var resource = JSON.parse(js_resource);
	var data = resource.data;

	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Resources');
		var currentTime = new Date().getTime();
		col.findOneAndUpdate({_id: id}, {$set: {data: data, modified: currentTime}}, function(err, r) {
			res.writeHead(302, {'Location': '/resources'});
			res.end();
			client.close();
			return;
		});
	});
});

/*
 * Delete a resource, given its id
 * Authentication required.
 */
app.get('/resource/delete/:id', middleware.checkToken, function(req, res) {
	if(!isUserAutenthicated(req)) {
		res.setHeader('Content-Type', 'text/html');
		res.status(401).send('You should be connected to do this operation');
		return;
	}

	if(!req.params.id) {
		res.setHeader('Content-Type', 'text/html');
		res.status(400).send('Missing resource id');
		return;
	}

	var id = req.params.id;
	MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
		if(err) throw err;
		const db = client.db(dbName);
		const col = db.collection('Resources');
		var currentTime = new Date().getTime();
		col.findOneAndUpdate({id: id, deleted:undefined}, {$set: {data: [], modified: currentTime, deleted: currentTime}}, function(err, r) {
			res.writeHead(302, {'Location': '/resources'});
			res.end();
			client.close();
			return;
		});
	});
});

/*
 * Page 404
 */
app.use(function(req, res, next){
		res.setHeader('Content-Type', 'text/plain');
		res.status(404).send('Page introuvable !');
});

app.listen(config.app_port);
console.log('Listening on port '+config.app_port);
module.exports = app; // for testing