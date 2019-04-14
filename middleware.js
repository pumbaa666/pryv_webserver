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
	let token = req.headers.authorization;

	if (!token) {
		req.headers.authorization = { success: false, message: 'Auth token is not supplied' };
		next();
		return;
	}

	var bearer_str = 'Bearer ';
	if (token.startsWith(bearer_str))
		token = token.slice(bearer_str.length, token.length);

	logger.debug('checkToken - token = '+JSON.stringify(token));
	jwt.verify(token, config.token.secret, (err, decoded) => {
		if (err) {
			req.headers.authorization = { success: false, message: 'Token is not valid' };
			next();
			return;
		}

		req.headers.authorization = { success: true };
		next();
		return;
	});
};

module.exports = { checkToken: checkToken };