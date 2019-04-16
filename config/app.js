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
	},
	resource: {
		maxCellLength: 512,
		maxArrayLength: 10
	}
};

module.exports = config;