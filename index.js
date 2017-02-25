var request = require('request');
var url = require('url');
var querystring = require('querystring');

// You can find more details about the Digikey API at https://api-portal.digikey.com/.

function flatten(arr) {
	var tmp = Array.prototype.concat.apply([], arr);
	return tmp.some(Array.isArray) ? flatten(tmp) : tmp;
}

// Handles getting the authorization code and refresh token
// ENDPOINT
// https://sso.digikey.com/as/authorization.oauth2
// This endpoint is the target of the initial request. It handles authenticating the user and user consent.
// The result includes the authorization code.
//
// PARAMETERS
// response_type - code
// Tells the Authorization Server to return an authorization code.
//
// client_id - This is the client id assigned to the application that you generated within the API Portal.
// Identifies the client that is making the request. The value passed in this parameter must exactly match the value assigned by the API Portal.
//
// redirect_uri - This URI must match the redirect URI that you defined while creating your application within the API Portal.
// Determines where the response is sent. The value of this parameter must exactly match the URI you provided while creating your application within the API Portal (including trailing '/').
// function getAuthorizationCode(clientId, clientSecret, redirectUri, cb, responseType){
// 	console.log('Running getAuthorizationCode()...');
// 	if(!clientId) {
// 		console.log('You must provide a DigiKey client id.');
// 		return false;
// 	}
// 	if(!clientSecret) {
// 		console.log('You must provide a DigiKey client secret.');
// 		return false;
// 	}
// 	if(!redirectUri) {
// 		console.log('You must provide a DigiKey redirect uri.');
// 		return false;
// 	}
//
// 	if(!responseType) {
// 		responseType = 'code';
// 	}
// 	var opt = {
// 		headers: {
// 			accept: 'application/json',
// 			'content-type': 'application/json'
// 		},
// 		url: url.format({
// 			protocol: 'https',
// 			host: 'sso.digikey.com',
// 			pathname: 'https://sso.digikey.com/as/authorization.oauth2?response_type=' + responseType + '&client_id=' + clientId + '&redirect_uri=' + redirectUri
// 		}),
// 		json: true
// 	};
// 	console.log(opt);
// 	return request.get(opt, cb ? function(err, res, body) {
// 		console.log(err);
// 		console.log(res);
// 		console.log(body);
// 		if (err)
// 			cb(err);
// 		else if (res.statusCode != 200)
// 			cb(new Error(JSON.parse(body).message));
// 		else
// 			cb(null, JSON.parse(body));
// 	} : null);
// }

var DigiKeyNode = function(clientId, clientSecret, redirectUri, apiVersion) {
	var self = this;

	self.clientId = (clientId) ? clientId : process.env.DIGIKEY_CLIENT_ID;
	self.clientSecret = (clientSecret) ? clientSecret : process.env.DIGIKEY_CLIENT_SECRET;
	self.redirectUri = redirectUri;
	self.apiVersion = (apiVersion) ? apiVersion : 'v1';

	if(!redirectUri){
		if(process.env.DIGIKEY_CALLBACK_URL){
			self.redirectUri = process.env.DIGIKEY_CALLBACK_URL;
		}
		if(process.env.DIGIKEY_REDIRECT_URI){
			self.redirectUri = process.env.DIGIKEY_REDIRECT_URI;
		}
	}

	self.country = 'US'; // See ISO Code http://www.nationsonline.org/oneworld/country_code_list.htm
	self.lang = 'en'; //"en", "de", "fr", "ko", "zhs", "zht", "it", "es", "he"
	self.locale = '';
	self.currency = 'usd'; //"usd", "cad", "jpy", "gbp", "eur", "hkd", "sgd", "twd", "krw", "aud", "nzd", "inr", "dkk", "nok", "sek", "ils"

	//https://api.digikey.com/services/keywordsearch/v1/search
	var send = function(service, path, params, filters, cb) {
		if (typeof filters === 'function') {
			cb = filters; // skip filters
		} else if (filters) {
			// params = params.concat(encodeFilters(filters));
		}
		var opt = {
			method: 'POST',
			headers: {
				'x-digikey-locale-shiptocountry': self.country,
				'x-digikey-locale-currency': self.currency,
				// 'x-digikey-locale-site': self.locale,
				'x-digikey-locale-language': self.lang,
				authorization: '',
				accept: 'application/json',
				'content-type': 'application/json',
				'x-ibm-client-id': 'REPLACE_THIS_KEY'
			},
			url: url.format({
				protocol: 'https',
				host: 'api.digikey.com',
				pathname: '/services/' + service + '/api/' + self.apiVersion + '/' + path
			}),
			body: {
				PartPreference: 'CT', Quantity: 25, PartNumber: 'P5555-ND'
			},
			json: true
		};
		return request.get(opt, cb ? function(err, res, body) {
			if (err)
				cb(err);
			else if (res.statusCode != 200)
				cb(new Error(JSON.parse(body).message));
			else
				cb(null, JSON.parse(body));
		} : null);
	};

	self.getAuthCode = function(cb) {
		return getAuthorizationCode(self.clientId, self.clientSecret, self.redirectUri, cb);
	};

	['basic', 'keyword'].forEach(function(name) {
		// uids = '2239e3330e2df5fe' or ['2239e3330e2df5fe', ...]
		// filters = response filters
		// self[name + 'ByID'] = function(uids, filters, cb) {
		// 	if (Array.isArray(uids)) {
		// 		var params = [].concat(uids).map(function(uid) {
		// 			return 'uid[]=' + uid;
		// 		});
		// 		return send(name + '/get_multi', params, filters, cb);
		// 	} else
		// 		return send(name + '/' + uids, [], filters, cb);
		// };
		// args = {q: 'foobar'} or [{q: 'foobar'}, ...]
		// filters = response filters
		self[name + 'Search'] = function(args, filters, cb) {
			var params = [].concat(args).map(function(key) {
				return querystring.stringify(key);
			});
			return send(name + '/search', params, filters, cb);
		};
	});

	return self;
};

// https://sso.digikey.com/as/authorization.oauth2?response_type=code&client_id=123456789abcdefg&redirect_uri=https://my-new-app.example.com/code
exports.createV1 = function(clientId, clientSecret, redirectUri) {
	console.log('Inside of createV1');

	return new DigiKeyNode(clientId, clientSecret, redirectUri, 'v1');
};
