const config = {
	app: {
		port: 8080
	},
	database: {
		url: 'localhost',
		port: 27017,
		name: 'PryvDB',
	},
	token: {
		secret: 'NoJoker'
	}
};

module.exports = config;