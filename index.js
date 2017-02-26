var request = require('request');
var url = require('url');
var querystring = require('querystring');

// You can find more details about the Digikey API at https://api-portal.digikey.com/.

function flatten(arr) {
	var tmp = Array.prototype.concat.apply([], arr);
	return tmp.some(Array.isArray) ? flatten(tmp) : tmp;
}

function encodeFilters(filters) {
	var result = flatten(Object.keys(filters).map(function(k) {
		var v = Array.prototype.concat.apply([], filters[k]);
		return v.map(function(vi) {
			if (vi instanceof Object) {
				return Object.keys(vi).map(function(ki) {
					return k + '[' + ki + ']=' + querystring.escape(vi[ki]); // e.g. slice[field1]=1:5
				});
			} else {
				return k + '[]=' + querystring.escape(vi); // e.g. show[]=foo
			}
		});
	}));
	return result;
}

var DigiKeyNode = function(accessToken, apiVersion) {
	var self = this;

	self.clientId = process.env.DIGIKEY_CLIENT_ID;
	self.clientSecret = process.env.DIGIKEY_CLIENT_SECRET;
	self.redirectUri = process.env.DIGIKEY_CALLBACK_URL;
	self.apiVersion = (apiVersion) ? apiVersion : 'v1';
	self.accessToken = accessToken;
	self.refreshToken = null;
	self.expiresIn = 2592000;

	if(!self.accessToken){
		console.error('You must provide a valid access token. See https://api-portal.digikey.com/start for more.');
		return new Error('You must provide a valid access token. See https://api-portal.digikey.com/start for more.');
	}

	// Try an alternate env variable
	if(!self.redirectUri){
		if(process.env.DIGIKEY_REDIRECT_URI){
			self.redirectUri = process.env.DIGIKEY_REDIRECT_URI;
		}
	}

	self.country = 'US'; // See ISO Code http://www.nationsonline.org/oneworld/country_code_list.htm
	self.lang = 'en'; //"en", "de", "fr", "ko", "zhs", "zht", "it", "es", "he"
	self.locale = 'us'; // "ad", "ae", "af", "ag", "ag", "ai", "al", "am", "an", "ao", "aq", "ar", "as",
											// "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi",
											// "bj", "bm", "bn", "bo", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc",
											// "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cs", "cu",
											// "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee",
											// "eg", "eh", "er", "es", "et", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb",
											// "gd", "ge", "gf", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt",
											// "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "in",
											// "io", "iq", "ir", "is", "it", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km",
											// "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls",
											// "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mg", "mh", "mk", "ml", "mm",
											// "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz",
											// "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om",
											// "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw",
											// "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg",
											// "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "st", "sv", "sx", "sy",
											// "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tp",
											// "tr", "tt", "tv", "tw", "tz", "ua", "ug", "uy", "um", "us", "uz", "va", "vc",
											// "ve", "vg", "vi", "vn", "vu", "wf", "ws", "ye", "yt", "yu", "za", "zm", "zw"
	self.currency = 'usd'; //"usd", "cad", "jpy", "gbp", "eur", "hkd", "sgd", "twd", "krw", "aud", "nzd", "inr", "dkk", "nok", "sek", "ils"

	// Valid Endpoints
	// https://api.digikey.com/services/keywordsearch/v1/search
	// https://api.digikey.com/services/basicsearch/v1/search
	var send = function(service, path, params, filters, cb) {
		if (typeof filters === 'function') {
			cb = filters; // skip filters
		} else if (filters) {
			// Filters aren't used at the moment.
			// params = params.concat(encodeFilters(filters));
		}

		var opt = {
			method: 'POST',
			headers: {
				'x-digikey-locale-shiptocountry': self.country,
				'x-digikey-locale-currency': self.currency,
				'x-digikey-locale-site': self.locale,
				'x-digikey-locale-language': self.lang,
				authorization: self.accessToken,
				accept: 'application/json',
				'content-type': 'application/json',
				'x-ibm-client-id': self.clientId
			},
			url: url.format({
				protocol: 'https',
				host: 'api.digikey.com',
				pathname: '/services/' + service + '/' + self.apiVersion + '/' + path
			}),
			body: params,
			json: true
		};
		return request.get(opt,
			cb ? function(err, res, body) {
				if (err){
					cb(err);
				} else if (res.statusCode != 200) {
					cb(new Error(body.message));
				} else {
					cb(null, body);
				}
			} : null);
	};

	['basic', 'keyword'].forEach(function(name) {
		// The params are attached to the body of the request.
		// Example params
		// {
		// 	PartPreference: 'CT', Quantity: 25, PartNumber: 'P5555-ND'
		// }
		// filters = N/A at he moment
		self[name + 'Search'] = function(params, cb) {
			return send(name + 'search', 'search', params, {}, cb);
		};
	});

	// Handles refreshing the access token
	// See https://api-portal.digikey.com/app_overview#refreshToken
	self.refreshToken = function(refreshToken, expiresIn){
		// A token exists
		if(!refreshToken){
			var err = 'Unable to find a valid Digikey token.';
			console.error(err);
			return new Error(err);
		}

		self.expiresIn = (expiresIn) ? expiresIn : self.expiresIn;

		// JSON access token
		const tokenObject = {
			'access_token': self.accessToken,
			'refresh_token': self.refreshToken,
			'expires_in': self.expiresIn
		};

		// Create the access token wrapper
		const token = oauth2.accessToken.create(tokenObject);

		// Check if the token is expired. If expired it is refreshed.
		if (token.expired()) {
			// Promises
			return token.refresh();
		}
	};

	return self;
};

// https://sso.digikey.com/as/authorization.oauth2?response_type=code&client_id=123456789abcdefg&redirect_uri=https://my-new-app.example.com/code
exports.createV1 = function(accessToken) {
	return new DigiKeyNode(accessToken, 'v1');
};
