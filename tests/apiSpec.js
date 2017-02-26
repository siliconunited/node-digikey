var assert = require('chai').assert;
var sinon = require('sinon');
var PassThrough = require('stream').PassThrough;
var http = require('http');
var request = require('request');

require('dotenv').config();
require('request-debug')(request);

var api = require('../index.js');

var cli = undefined;

describe('DigiKey Api', function() {
	beforeEach(function() {
		this.request = sinon.stub(http, 'request');
	});

	afterEach(function() {
		http.request.restore();
	});

	//We will place our tests cases here
	it('should create an instance of the cli', function(done) {
		// var expected = {
		// 	"access_token": "weoiaslkjfoiw32/12#kd",
		// 	"refresh_token": "aslidf390-sdl/jliDLSksli",
		// 	"token_type": "Bearer",
		// 	"expires_in": 2592000,
		// 	"expires_at": 2592000
		// };
		// var response = new PassThrough();
		// response.write(JSON.stringify(expected));
		// response.end();
		//
		// var request = new PassThrough();

		// this.request
		// 	.callsArgWith(1, response)
		// 	.returns(request);

		// Get a code
		// Error: https://my-new-app.example.com/code?error=access_denied
		// Success: https://my-new-app.example.com/code?code=6513183215H5465sdlkjKils

		//NOTE: In order to use the tests. You'll need to generate your own authorization token.
		cli = api.createV1(process.env.DIGIKEY_AUTH_TOKEN);
		if(!process.env.DIGIKEY_AUTH_TOKEN){
			var err = 'You must provide a valid authorization token. See https://api-portal.digikey.com/start for more.';
			done(err);
		}
		assert.isObject(cli, 'cli is an object');
		done();
	});

	//We will place our tests cases here
	it('should get search results', function(done) {
		// args, filters, callback
		cli.basicSearch({},{},function(err, results){
			console.log(results);
			if(err){
				done(err);
			}
			assert.isAbove(results, 0, 'result length above 0');
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

});
