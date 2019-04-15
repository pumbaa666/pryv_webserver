const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const server = require('../src/http_server');
const async_series = require('async').series;

/*
 * Logger
 */
var log4js = require('log4js');
log4js.configure('./config/log4js.json');
var logger = log4js.getLogger('tests');

/*
 * Database
 */
const UsersModel = require('../models/users')
const ResourcesModel = require('../models/resources')

/*
 * Data
 */
var referenceUser = {username: 'Supername', password: 'secret_password'};
var referenceResource = {id: '5cab7a441c94682b7c59b226', data: ["1", "2"]};
var token;

chai.use(chaiHttp);

function clearDatabase(done) {
	logger.debug('start clearing');
	async_series([
		(done) => {
			logger.debug('clearing resources');
			ResourcesModel.collection.drop();
			done();
		},
		(done) => {
			logger.debug('clearing users');
			UsersModel.collection.drop();
			done();
		}
	],
	() => {
		logger.debug('clearing done');
		done();
	});
}

describe('Test all webserver endpoint', () => {
	before((done) => {
		logger.debug('BEFORE');
		// async_series([
			// Clear database
			// (done) => {
			// 	clearDatabase(done);
			// },

			// Create user, login, save token
			// (done) => {
				logger.debug('create user, login, etc');
				let user = { username: referenceUser.username+"_admin", password: referenceUser.password };
				let body = { js_user: JSON.stringify(user) };
	
				// Create user
				chai.request(server)
					.post('/users')
					.set('Content-Type', 'application/json')
					.send(body)
					.end((err, res) => {
						res.should.have.status(201);
						res.body.should.have.property('_id');

						// Login using previously created user
						chai.request(server)
							.post('/auth/login')
							.set('Content-Type', 'application/json')
							.send({ username: referenceUser.username+"_admin", password: referenceUser.password })
							.then(function (res) {
								// Save token to authenticate future requests
								res.should.have.status(200);
								res.body.should.have.property('token').not.null;
								token = res.body.token;
								done();
							});
					});
			// },
		// ],

		// // Terminate the "before" assignement
		// () => {
		// 	done();
		// });
	});
	
	after((done) => {
		logger.debug('AFTER');
		clearDatabase(done);
	});

	describe('/POST Users', () => {
		it('it should not create an empty user', (done) => {
			logger.debug('Start first test');
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

		it('it should GET a resource', (done) => {
			chai.request(server)
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

		it('it should not create a resource without data', (done) => {
			var resource = { id: referenceResource.id };
			var body = { js_resource: JSON.stringify(resource) };
			chai.request(server)
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

		it('it should create a resource when logged', (done) => {
			var resource = { id: referenceResource.id, data: referenceResource.data };
			var body = { js_resource: JSON.stringify(resource) };
			chai.request(server)
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

		it('it should not edit a resource without data', (done) => {
			var resource = { id: referenceResource.id, data: [] };
			var body = { js_resource: JSON.stringify(resource) };

			chai.request(server)
				.put('/resource/edit/' + referenceResource.id)
				.set('Authorization', token)
				.set('Content-Type', 'application/json')
				.send(body)
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property('err').eql('One field required');
					done();
				});
		});	

		it('it should edit a resource when logged', (done) => {
			var newData = ['a', 'b', 'c'];
			var resource = { id: referenceResource.id, data: newData };
			var body = { js_resource: JSON.stringify(resource) };

			chai.request(server)
				.put('/resource/edit/' + referenceResource.id)
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

		it('it should delete a resource when logged', (done) => {
			chai.request(server)
				.delete('/resource/' + referenceResource.id)
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