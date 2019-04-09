const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const server = require('../http_server');
const config = require('../config');

/*
 * Database
 */
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const mongoDbUrl = 'mongodb://'+config.db_url+':'+config.db_port;
const dbName = config.db_name;

var referenceUser = {_id: '5cab7a441c94682b7c59b225', username: 'Supername', password: 'secret_password'};
var referenceResource = {_id: '5cab7a441c94682b7c59b226', id: '5cab7a441c94682b7c59b226', data: ["1", "2"]};

var app = require('../http_server');
var supertest = require('supertest');
var authenticatedUser = supertest.agent(app);

chai.use(chaiHttp);

describe('Test all webserver endpoint', () => {
	before((done) => {
		MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
			if(err) throw err;
			const db = client.db(dbName);
			const col = db.collection('Users');
			col.drop();
		});
		MongoClient.connect(mongoDbUrl, {useNewUrlParser: true}, function (err, client) {
			if(err) throw err;
			const db = client.db(dbName);
			const col = db.collection('Resources');
			col.drop();
		});
		done();
	});
	
	describe('/GET index', () => {
		it('it should GET a response', (done) => {
			chai.request(server)
				.get('/')
				.end((err, res) => {
				res.should.have.status(200);
				done();
			});
		});
	});

	describe('/POST Users', () => {
		it('it should not create an empty user', (done) => {
			let user = {};
			let body = {js_user: JSON.stringify(user)};
			chai.request(server)
				.post('/users')
				.type('form')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.text.should.be.eql('Missing username/password');
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
				.type('form')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.text.should.be.eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Users', () => {
		it('it should not create a user without username', (done) => {
			let user = {password: referenceUser.password};
			let body = {js_user: JSON.stringify(user)};
			chai.request(server)
				.post('/users')
				.type('form')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.text.should.be.eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Users', () => {
		it('it should create a user with username and password', (done) => {
			let user = {
				_id: referenceUser._id,
				username: referenceUser.username,
				password: referenceUser.password};
				
			let body = {js_user: JSON.stringify(user)};

			chai.request(server)
				.post('/users')
				.type('form')
				.send(body)
				.end((err, res) => {
					res.should.have.status(200);
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should not authenticate without password', (done) => {
			chai.request(server)
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.end((err, res) => {
					res.should.have.status(400);
					res.text.should.be.eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should not authenticate without username', (done) => {
			chai.request(server)
				.post('/auth/login')
				.type('form')
				.send({password: referenceUser.password})
				.end((err, res) => {
					res.should.have.status(400);
					res.text.should.be.eql('Missing username/password');
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should authenticate', (done) => {
			chai.request(server)
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.end((err, res) => {
					res.should.have.status(200);
					done();
				});
		});
	});

	describe('/POST Auth', () => {
		it('it should login, get a resource, logout and not get a resource', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					agent
						.get('/resources')
						.then(function(res){
							res.should.have.status(200);
							agent
								.get('/auth/logout')
								.then(function(res){
									res.should.have.status(200);
									agent
										.get('/resources')
										.end((err, res) => {
											res.should.have.status(401);
											done();
										});
								});
						});							
				});
		});	
	});

	describe('/GET resource', () => {
		it('it should not GET resources without beeing authenticated', (done) => {
			chai.request(server)
				.get('/resources')
				.end((err, res) => {
				res.should.have.status(401);
				done();
			});
		});
	});

	describe('/GET resource', () => {
		it('it should GET a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					agent
						.get('/resources')
						.end((err, res) => {
							res.should.have.status(200);
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
				.type('form')
				.send(body)
				.end((err, res) => {
					res.should.have.status(401);
					done();
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should create a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					var resource = {id: referenceResource.id, data: referenceResource.data};
					var body = {js_resource: JSON.stringify(resource)};
					agent
						.post('/resource')
						.type('form')
						.send(body)
						.end((err, res) => {
							res.should.have.status(200);
							done();
						});
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should not create a resource without data', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					var resource = {id: referenceResource.id};
					var body = {js_resource: JSON.stringify(resource)};
					agent
						.post('/resource')
						.type('form')
						.send(body)
						.end((err, res) => {
							res.should.have.status(400);
							done();
						});
				});
		});	
	});
	
	describe('/POST resource', () => {
		it('it should not edit a resource without being logged', (done) => {
			var resource = {id: referenceResource.id, data: referenceResource.data};
			var body = {js_resource: JSON.stringify(resource)};
			chai.request(server)
				.post('/resource/edit/'+referenceResource.id)
				.type('form')
				.send(body)
				.end((err, res) => {
					res.should.have.status(401);
					done();
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should edit a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					var resource = {data: ["a", "b", "c"]};
					var resourceName = "js_resource_"+referenceResource.id;
					var body = {};
					body[resourceName] = JSON.stringify(resource);
					agent
						.post('/resource/edit/'+referenceResource.id)
						.type('form')
						.send(body)
						.end((err, res) => {
							res.should.have.status(200);
							done();
						});
				});
		});	
	});

	describe('/POST resource', () => {
		it('it should not edit a resource without data', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					var resource = {data: []};
					var resourceName = "js_resource_"+referenceResource.id;
					var body = {};
					body[resourceName] = JSON.stringify(resource);
					agent
						.post('/resource/edit/'+referenceResource.id)
						.type('form')
						.send(body)
						.end((err, res) => {
							res.should.have.status(200);
							done();
						});
				});
		});	
	});
	
	describe('/GET resource', () => {
		it('it should not delete a resource without being logged', (done) => {
			chai.request(server)
				.get('/resource/delete/'+referenceResource.id)
				.end((err, res) => {
					res.should.have.status(401);
					done();
				});
		});	
	});
	
	describe('/GET resource', () => {
		it('it should delete a resource when logged', (done) => {
			var agent = chai.request.agent(server);
			agent
				.post('/auth/login')
				.type('form')
				.send({username: referenceUser.username})
				.send({password: referenceUser.password})
				.then(function(res){
					agent
						.get('/resource/delete/'+referenceResource.id)
						.end((err, res) => {
							res.should.have.status(200);
							// TODO return the resource in the App and test here if data is empty and the deleted flag is set.
							done();
						});
				});
		});	
	});

	describe('/DELETE Users', () => {
		it('it should delete a user', (done) => {
			chai.request(server)
				.get('/user/delete/'+referenceUser._id)
				.end((err, res) => {
					res.should.have.status(200);
					done();
				});
		});
	});
});