const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const server = require('../http_server');
const config = require('../config');

/*
 * Logger
 */
var log4js = require('log4js');
log4js.configure('./config/log4js.json');
var logger = log4js.getLogger('app');

/*
 * Database
 */
const sanitize = require('mongo-sanitize'); // Protect db againsts injection
const mongoose = require('mongoose');
const mongoDbUrl = 'mongodb://' + config.database.url + ':' + config.database.port + '/' + config.database.name;
logger.debug('Connecting to Database : ' + mongoDbUrl);
mongoose.connect(mongoDbUrl, { useNewUrlParser: true, useCreateIndex: true}); // useCreateIndex : https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&ved=2ahUKEwj01KKn4M_hAhUCKewKHZu3C_EQFjAAegQIBBAB&url=https%3A%2F%2Fgithub.com%2FAutomattic%2Fmongoose%2Fissues%2F6890&usg=AOvVaw1LQ5-k1g-Sr9xz0RQKIKlE
const db = mongoose.connection; //Get the default connection
mongoose.set('useFindAndModify', false); // Don't show deprecation warning : https://github.com/Automattic/mongoose/issues/6880
const UsersModel = require('../models/users')
const ResourcesModel = require('../models/resources')

var referenceUser = {/*_id: '5cab7a441c94682b7c59b225', */username: 'Supername', password: 'secret_password'};
var referenceResource = {/*_id: '5cab7a441c94682b7c59b226', */id: '5cab7a441c94682b7c59b226', data: ["1", "2"]};

var app = require('../http_server');
var supertest = require('supertest');
// var authenticatedUser = supertest.agent(app);

chai.use(chaiHttp);

describe('Test all webserver endpoint', () => {
	before((done) => {
		ResourcesModel.collection.drop(() => {
			UsersModel.collection.drop(() => {
				done();
			})
		})
	});
	
	after((done) => {
		ResourcesModel.collection.drop(() => {
			UsersModel.collection.drop(() => {
				done();
			})
		})
	});

	describe('/POST Users', () => {
		it('it should not create an empty user', (done) => {
			let user = {};
			let body = {js_user: JSON.stringify(user)};
			chai.request(server)
				.post('/users')
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property('err').eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Users', () => {
		it('it should not create a user without password', (done) => {
			let user = {username: referenceUser.username};
			let body = {js_user: JSON.stringify(user)};
			chai.request(server)
				.post('/users')
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property('err').eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Users', () => {
		it('it should not create a user without username', (done) => {
			let user = { password: referenceUser.password };
			let body = { js_user: JSON.stringify(user) };
			chai.request(server)
				.post('/users')
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property('err').eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Users', () => {
		it('it should create a user with username and password', (done) => {
			let user = { username: referenceUser.username, password: referenceUser.password };
			let body = { js_user: JSON.stringify(user) };

			chai.request(server)
				.post('/users')
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(201);
					res.body.should.have.property('_id');
					res.body.should.have.property('username').eql(referenceUser.username);
					res.body.should.have.property('password').not.eql(referenceUser.password); // Password should be hashed, so not equal to raw text
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should not authenticate without password', (done) => {
			chai.request(server)
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property('err').eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should not authenticate without username', (done) => {
			chai.request(server)
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({password: referenceUser.password})
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property('err').eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should authenticate', (done) => {
			chai.request(server)
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.end((err, res) => {
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					done();
				});
		});
	});

	describe('/GET resource', () => {
		it('it should not GET resources without beeing authenticated', (done) => {
			chai.request(server)
				.get('/resources')
				.end((err, res) => {
					res.should.have.status(401);
					res.body.should.have.property('error');
					res.body.error.should.have.property('reason').eql('Auth token is not supplied');
					done();
				});
		});
	});

	describe('/GET resource', () => {
		it('it should GET a resource', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					var token = res.body.token;
					agent
						.get('/resources')
						.set('Authorization', token) // set has to be after get : https://github.com/visionmedia/supertest/issues/398
						.end((err, res) => {
							res.should.have.status(200);
							res.body.should.be.a('array');
							res.body.length.should.be.eql(0);
							done();
						});							
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should not create a resource without being logged', (done) => {
			var resource = {id: referenceResource.id, data: referenceResource.data};
			var body = {js_resource: JSON.stringify(resource)};
			chai.request(server)
				.post('/resource')
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(401);
					res.body.should.have.property('error');
					res.body.error.should.have.property('reason').eql('Auth token is not supplied');
					done();
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should not create a resource without data', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					var token = res.body.token;

					var resource = {id: referenceResource.id};
					var body = {js_resource: JSON.stringify(resource)};
					agent
						.post('/resource')
						.set('Authorization', token)
						.set('Content-Type', 'application/json')
						.send(body)
						.end((err, res) => {
							res.should.have.status(400);
							res.body.should.have.property('err').eql('One field required');
							done();
						});
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should create a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					var token = res.body.token;

					var resource = {id: referenceResource.id, data: referenceResource.data};
					var body = {js_resource: JSON.stringify(resource)};
					agent
						.post('/resource')
						.set('Authorization', token)
						.set('Content-Type', 'application/json')
						.send(body)
						.end((err, res) => {
							res.should.have.status(201);
							res.body.should.be.a('object');
							res.body.should.have.property('id').eql(referenceResource.id);
							res.body.should.have.property('data');
							res.body.data.should.be.a('array');
							res.body.data.length.should.be.eql(referenceResource.data.length);
							done();
						});
				});
		});	
	});
	
	describe('/PUT resource', () => {
		it('it should not edit a resource without being logged', (done) => {
			var resource = {id: referenceResource.id, data: referenceResource.data};
			var body = {js_resource: JSON.stringify(resource)};
			chai.request(server)
				.put('/resource/edit/'+referenceResource.id)
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(401);
					res.body.should.have.property('error');
					res.body.error.should.have.property('reason').eql('Auth token is not supplied');
					done();
				});
		});	
	});
	
	describe('/PUT resource', () => {
		it('it should not edit a resource without data', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					var token = res.body.token;

					var resource = {id: referenceResource.id, data: []};
					var body = {js_resource: JSON.stringify(resource)};
		
					agent
						.put('/resource/edit/'+referenceResource.id)
						.set('Authorization', token)
						.set('Content-Type', 'application/json')
						.send(body)
						.end((err, res) => {
							res.should.have.status(400);
							res.body.should.have.property('err').eql('One field required');
							done();
						});
				});
		});	
	});

	describe('/PUT resource', () => {
		it('it should edit a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					var token = res.body.token;

					var newData = ['a', 'b', 'c'];
					var resource = {id: referenceResource.id, data: newData};
					var body = {js_resource: JSON.stringify(resource)};

					agent
						.put('/resource/edit/'+referenceResource.id)
						.set('Authorization', token)
						.set('Content-Type', 'application/json')
						.send(body)
						.end((err, res) => {
							res.should.have.status(201);
							res.body.should.be.a('object');
							res.body.should.have.property('id').eql(referenceResource.id);
							res.body.should.have.property('data');
							res.body.data.should.be.a('array');
							res.body.data.length.should.be.eql(newData.length);
							done();
						});
				});
		});	
	});
	
	describe('/DELETE resource', () => {
		it('it should not delete a resource without being logged', (done) => {
			chai.request(server)
				.delete('/resource/'+referenceResource.id)
				.end((err, res) => {
					res.should.have.status(401);
					res.body.should.have.property('error');
					res.body.error.should.have.property('reason').eql('Auth token is not supplied');
					done();
				});
		});	
	});
		
	describe('/DELETE resource', () => {
		it('it should delete a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.set('Content-Type', 'application/json')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					res.should.have.status(200);
					res.body.should.have.property('token').not.null;
					var token = res.body.token;

					agent
						.delete('/resource/'+referenceResource.id)
						.set('Authorization', token)
						.end((err, res) => {
							res.should.have.status(200);
							res.body.should.be.a('object');
							res.body.should.have.property('id').eql(referenceResource.id);
							res.body.should.have.property('data');
							res.body.data.should.be.a('array');
							res.body.data.length.should.be.eql(0);
							done();
						});
				});
		});	
	});
});