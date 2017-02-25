var request = require('request');
var url = require('url');
var querystring = require('querystring');

// You can find more details about the Digikey API at https://api-portal.digikey.com/.

function flatten(arr) {
	var tmp = Array.prototype.concat.apply([], arr);
	return tmp.some(Array.isArray) ? flatten(tmp) : tmp;
}

// Handles getting the authorization code and refresh token
// See https://api-portal.digikey.com/app_overview
function getAuthorization(clientId, redirectUri, responseType){
	if(!clientId) {
		console.log('You must provide a DigiKey client id.');
		return false;
	}
	if(!redirectUri) {
		console.log('You must provide a DigiKey redirect uri.');
		return false;
	}

	if(!responseType) {
		responseType = 'code';
	}

	var opt = {
		headers: {
			accept: 'application/json',
			'content-type': 'application/json'
		},
		url: url.format({
			protocol: 'https',
			host: 'sso.digikey.com',
			pathname: '/as/authorization.oauth2?response_type=' + responseType + '&client_id=' + clientId + '&redirect_uri=' + redirectUri
		}),
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
}

var DigikeyNode = function(auth, apiVersion) {
	var self = this;

	var country = 'US'; // See ISO Code http://www.nationsonline.org/oneworld/country_code_list.htm
	var lang = 'en'; //"en", "de", "fr", "ko", "zhs", "zht", "it", "es", "he"
	var locale = '';
	var currency = 'usd'; //"usd", "cad", "jpy", "gbp", "eur", "hkd", "sgd", "twd", "krw", "aud", "nzd", "inr", "dkk", "nok", "sek", "ils"

	//https://api.digikey.com/services/keywordsearch/v1/search
	var send = function(service, path, params, filters, cb) {
		if (typeof filters === 'function') {
			cb = filters; // skip filters
		} else if (filters) {
			params = params.concat(encodeFilters(filters));
		}
		var opt = {
			method: 'POST',
			headers: {
				'x-digikey-locale-shiptocountry': country,
				'x-digikey-locale-currency': currency,
				// 'x-digikey-locale-site': 'REPLACE_THIS_VALUE',
				'x-digikey-locale-language': lang,
				authorization: '',
				accept: 'application/json',
				'content-type': 'application/json',
				'x-ibm-client-id': 'REPLACE_THIS_KEY'
			},
			url: url.format({
				protocol: 'https',
				host: 'api.digikey.com',
				pathname: '/services/' + service + '/api/' + apiVersion + '/' + path
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
exports.createV1 = function(clientId, redirectUri) {
	if(!clientId){
		clientId = process.env.DIGIKEY_CLIENT_ID;
	}
	if(!redirectUri){
		if(process.env.DIGIKEY_CALLBACK_URL){
			redirectUri = process.env.DIGIKEY_CALLBACK_URL;
		}
		if(process.env.DIGIKEY_REDIRECT_URI){
			redirectUri = process.env.DIGIKEY_REDIRECT_URI;
		}
	}
	return getAuthorization(clientId, redirectUri).then(function(err, results){
		console.log(err);
		console.log(results);
		return new DigikeyNode(results, 'v1');
	});
};
