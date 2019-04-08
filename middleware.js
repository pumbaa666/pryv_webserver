/*
 * Source :
 * https://medium.com/dev-bits/a-guide-for-adding-jwt-token-based-authentication-to-your-single-page-nodejs-applications-c403f7cf04f4
 */

let jwt = require('jsonwebtoken');
const config = require('./config.js');

let checkToken = (req, res, next) => {
	let token = req.headers.authorization.token;
	
	if(!token)
	{
		req.headers.authorization.token = {success: false, message: 'Auth token is not supplied'};
		next();
		return;
	}

	var bearer_str = 'Bearer ';
	if (token.startsWith(bearer_str))
		token = token.slice(bearer_str.length(), token.length);

	jwt.verify(token, config.token_secret, (err, decoded) => {
		if (err)
		{
			console.log('Token is not valid : '+err);
			req.headers.authorization.token = {success: false, message: 'Token is not valid'};
			next();
			return;
		}

		req.headers.authorization.token = {success: true};
		next();
		return;
	});
};

module.exports = {checkToken: checkToken};