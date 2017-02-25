var assert = require('assert');
var sinon = require('sinon');
var PassThrough = require('stream').PassThrough;
var http = require('http');
var request = require('request');

require('dotenv').config();
require('request-debug')(request);

var app = require('../app.js');
var api = require('../index.js');

describe('api', function() {
	beforeEach(function() {
		this.request = sinon.stub(http, 'request');
	});

	afterEach(function() {
		http.request.restore();
	});

	//We will place our tests cases here
	it('should convert get result to object', function(done) {
		var expected = {
			"access_token": "weoiaslkjfoiw32/12#kd",
			"refresh_token": "aslidf390-sdl/jliDLSksli",
			"token_type": "Bearer",
			"expires_in": 3920
		};
		var response = new PassThrough();
		response.write(JSON.stringify(expected));
		response.end();

		var request = new PassThrough();

		// this.request
		// 	.callsArgWith(1, response)
		// 	.returns(request);

		// Get a code
		// Error: https://my-new-app.example.com/code?error=access_denied
		// Success: https://my-new-app.example.com/code?code=6513183215H5465sdlkjKils

		var cli = app.createV1(process.env.DIGIKEY_CLIENT_ID, process.env.DIGIKEY_CLIENT_SECRET, process.env.DIGIKEY_CALLBACK_URL);
		cli.getAuthCode(function(err, results){
			console.log(err);
			console.log(results);
			done();
		});

	});

	// it('should send post params in request body', function() {
	// 	var params = { foo: 'bar' };
	// 	var expected = JSON.stringify(params);
	//
	// 	var request = new PassThrough();
	// 	var write = sinon.spy(request, 'write');
	//
	// 	this.request.returns(request);
	//
	// 	api.post(params, function() { });
	//
	// 	assert(write.withArgs(expected).calledOnce);
	// });

	it('should pass request error to callback', function(done) {
		var expected = 'some error';
		var request = new PassThrough();

		this.request.returns(request);

		api.auth(function(err) {
			assert.equal(err, expected);
			done();
		});

		request.emit('error', expected);
	});
});
