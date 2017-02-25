var assert = require('assert');
var sinon = require('sinon');
var PassThrough = require('stream').PassThrough;
var http = require('http');

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
		var expected = { hello: 'world' };
		var response = new PassThrough();
		response.write(JSON.stringify(expected));
		response.end();

		var request = new PassThrough();

		this.request
			.callsArgWith(1, response)
			.returns(request);

		api.get(function(err, result) {
			console.log(result);
			// assert.deepEqual(result, expected);
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

	// it('should pass request error to callback', function(done) {
	// 	var expected = 'some error';
	// 	var request = new PassThrough();
	//
	// 	this.request.returns(request);
	//
	// 	api.get(function(err) {
	// 		assert.equal(err, expected);
	// 		done();
	// 	});
	//
	// 	request.emit('error', expected);
	// });
});
