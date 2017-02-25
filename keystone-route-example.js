var keystone = require('keystone');
var keystone = require('keystone');
var async = require('async');
var User = keystone.list('User').model;
var Token = keystone.list('Token').model;

// INDEX ROUTE SETUP
// DigiKey API
// app.all('/digikey/auth', keystone.middleware.api, routes.views.apis.digikey);
// app.all('/digikey/callback?', keystone.middleware.api, routes.views.apis.digikey);

// TOKEN MODEL EXAMPLE
// Token.add({
// 	token: { type: String, initial: true, required: true },
// 	refreshToken: { type: String, initial: true },
// 	tokenType: { type: String },
// 	expiresIn: { type: Types.Number },
// 	expiresAt: { type: Types.Datetime },
// 	service: {
// 		type: Types.Select,
// 		options: [
// 			{ value: 'octopart', label: 'Octopart' },
// 			{ value: 'digikey', label: 'Digikey' },
// 			{ value: 'twitter', label: 'Twitter' },
// 			{ value: 'linkedin', label: 'LinkedIn' },
// 			{ value: 'github', label: 'Github' }
// 		],
// 		emptyOption: true,
// 		index: true,
// 		initial: true,
// 		required: true
// 	},
// 	state: { type: Types.Select, options: 'draft, published, archived', default: 'published', index: true }
// });
//
// Token.relationship({ ref: 'User', path: 'users', refPath: 'tokens' });

const oauth2 = require('simple-oauth2').create({
	client: {
		id: process.env.DIGIKEY_CLIENT_ID,
		secret: process.env.DIGIKEY_CLIENT_SECRET,
		secretParamName: 'client_secret',
		idParamName: 'client_id'
	},
	auth: {
		tokenHost: 'https://sso.digikey.com',
		tokenPath: '/as/token.oauth2',
		authorizeHost: 'https://sso.digikey.com',
		authorizePath: '/as/authorization.oauth2'
	},
	options: {
		useBasicAuthorizationHeader: false,
		useBodyAuth: true
	}
});

// Authorization uri definition
const authorizationUri = oauth2.authorizationCode.authorizeURL({
	redirect_uri: process.env.DIGIKEY_REDIRECT_URI
});

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// Init locals
	locals.section = 'digikey-callback';
	locals.filters = {
		code: (req.query.code) ? req.query.code : undefined
	};
	locals.accessToken = {};
	locals.tokenId = null;

	view.on('init', function (next) {
		if(locals.filters.code){
			next();
		} else {
			return res.redirect(authorizationUri);
		}
	});

	// Grab an authorization code
	view.on('init', function (next) {
		const code = locals.filters.code;
		if(!req.user){
			console.error('You must be logged in to perform this action.');
			return next(new Error('You must be logged in to perform this action.'));
		}
		if(!code){
			console.error('Unable to find a valid DigiKey authorization code');
			return next(new Error('Unable to find a valid DigiKey authorization code.'));
		}
		const options = {
			code
		};
		oauth2.authorizationCode.getToken(options, (error, result) => {
			if (error) {
				console.error('Access Token Error', error.message);
				return next(error);
			}

			// console.log('The resulting token: ', result);
			const token = oauth2.accessToken.create(result);
			locals.accessToken = token;

			// Generate a new token in the database
			var newToken = new Token({
				token: locals.accessToken.token.access_token,
				refreshToken: locals.accessToken.token.refresh_token,
				tokenType: locals.accessToken.token.token_type,
				expiresIn: locals.accessToken.token.expires_in,
				expiresAt: locals.accessToken.token.expires_at,
				service: 'digikey',
				state: 'published'
			});
			newToken.save();

			// Add the token to the current user and save
			var updatedUser = User.where({
				_id: req.user.id,
				state: 'active'
			})
			.update({ 'tokens': [ newToken ] })
			.setOptions({ multi: false })
			.exec(function(err){
				if(err){
					next(err);
				}
				// Update success
				next();
			});
		});
	});

	// Handle refresing the token
	// TODO: Implement this
	view.on('init', function (next) {
		// Grab the logged in user's token for digikey
		// User.findOne({
		// 	_id: req.user.id
		// })
		// .populate('tokens')
		// .exec(function(err, res){
		//
		// });

		// Sample of a JSON access token (you got it through previous steps)
		// const tokenObject = {
		// 	'access_token': '<access-token>',
		// 	'refresh_token': '<refresh-token>',
		// 	'expires_in': '7200'
		// };
		//
		// // Create the access token wrapper
		// const token = oauth2.accessToken.create(tokenObject);
		//
		// // Check if the token is expired. If expired it is refreshed.
		// if (token.expired()) {
		// 	// Callbacks
		// 	token.refresh((error, result) => {
		// 		token = result;
		// 	})
		//
		// 	// Promises
		// 	token.refresh()
		// 	.then((result) => {
		// 		token = result;
		// 	});
		// }
		next();
	});

	// Render the view
	view.render(function(err) {
		if(err) {
			return res.apiError('error', err);
		}
		res.apiResponse({
			token: locals.accessToken.token
		});
	});
};
