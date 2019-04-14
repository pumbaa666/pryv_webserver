/*
 * Source :
 * https://medium.com/dev-bits/a-guide-for-adding-jwt-token-based-authentication-to-your-single-page-nodejs-applications-c403f7cf04f4
 */

let jwt = require('jsonwebtoken');
const config = require('./config.js');

/*
 * Logger
 */
var log4js = require('log4js');
log4js.configure('./config/log4js.json');
var logger = log4js.getLogger('middleware');

let checkToken = (req, res, next) => {
	logger.debug('-- checkToken --');

	logger.debug('headers : '+JSON.stringify(req.headers));
	let token = req.headers.authorization;
	logger.debug('token : '+token);
	/* req.headers.authorization = {token :'osef_token'};
	token = req.headers.authorization.token;
	logger.debug('token : '+token);
	logger.debug('headers : '+JSON.stringify(req.headers)); */

	
	if(!token)
	{
		req.headers.authorization = {success: false, message: 'Auth token is not supplied'};
		next();
		return;
	}

	var bearer_str = 'Bearer ';
	if (token.startsWith(bearer_str))
		token = token.slice(bearer_str.length, token.length);

	jwt.verify(token, config.token.secret, (err, decoded) => {
		if (err)
		{
			req.headers.authorization = {success: false, message: 'Token is not valid'};
			next();
			return;
		}

		req.headers.authorization = {success: true};
		next();
		return;
	});
};

module.exports = {checkToken: checkToken};