'use strict';

var assert = require('assert');
var mocha = require('mocha');
var sinon = require('sinon');
var pkg = require('../package.json');
var gleipAssert = require('../');

var beforeEach = mocha.beforeEach;
var describe = mocha.describe;
var it = mocha.it;

describe(pkg.name, function() {
    var channel = {};

    beforeEach(function() {
        channel = ['assertQueue', 'assertExchange', 'bindQueue'].reduce(function(curr, fn) {
            curr[fn] = sinon.stub().yields();
            return curr;
        }, {});
    });

    it('should return with error if non-array options are given', function(done) {
        gleipAssert(channel, { queues: 'foo' }, function(err) {
            assert.ok(err);
            done();
        });
    });

    it('should assert the given exchanges', function(done) {
        var exs = ['foo', { name: 'some-ex', type: 'direct', options: { durable: false} }];
        gleipAssert(channel, { exchanges: exs }, function(err) {
            assert(!err);

            sinon.assert.calledWith(channel.assertExchange, 'foo', 'fanout', {});
            sinon.assert.calledWith(channel.assertExchange, 'some-ex', 'direct', { durable: false });

            done();
        });
    });

    it('should callback with error on exchange assertion error', function(done) {
        channel.assertExchange = sinon.stub().yields(new Error('Assertion error'));
        gleipAssert(channel, { exchanges: ['foo'] }, function(err) {
            assert.equal(err && err.message, 'Assertion error');
            done();
        });
    });

    it('should assert the given queues', function(done) {
        var qs = ['foo', { name: 'some-q', options: { exclusive: true, invalid: 'should be removed' } }];
        gleipAssert(channel, { queues: qs }, function(err) {
            assert(!err);

            sinon.assert.calledWith(channel.assertQueue, 'foo', {});
            sinon.assert.calledWith(channel.assertQueue, 'some-q', { exclusive: true });

            done();
        });
    });

    it('should assert bindings explicitly set on a queue', function(done) {
        channel.assertQueue = sinon.stub().yields(null, { queue: 'some-q-name' });
        gleipAssert(channel, { queues: [{ binding: { exchange: 'some-ex' } }] }, function(err) {
            assert(!err);
            sinon.assert.calledWith(channel.bindQueue, 'some-q-name', 'some-ex');
            done();
        });
    });

    it('should callback with error on explicit queue bind failure', function(done) {
        channel.assertQueue = sinon.stub().yields(new Error('Assertion error'));
        gleipAssert(channel, { queues: [{ binding: { exchange: 'some-ex' } }] }, function(err) {
            assert.equal(err && err.message, 'Assertion error');
            done();
        });
    });

    it('should callback with error on queue assertion error', function(done) {
        channel.assertQueue = sinon.stub().yields(new Error('Assertion error'));
        gleipAssert(channel, { queues: ['foo'] }, function(err) {
            assert.equal(err && err.message, 'Assertion error');
            done();
        });
    });

    it('should assert the given bindings', function(done) {
        var bindings = [
            { queue: 'q', exchange: 'ex', pattern: 'moo', arguments: { foo: 'bar' } },
            { queue: 'q2', exchange: 'ex2' }
        ];

        gleipAssert(channel, { bindings: bindings }, function(err) {
            assert(!err);

            sinon.assert.calledWith(channel.bindQueue, 'q', 'ex', 'moo', { foo: 'bar' });
            sinon.assert.calledWith(channel.bindQueue, 'q2', 'ex2', '', {});

            done();
        });
    });

    it('should callback with error on binding assertion error', function(done) {
        channel.bindQueue = sinon.stub().yields(new Error('Assertion error'));
        gleipAssert(channel, { bindings: [{ queue: 'foo', exchange: 'bar' }] }, function(err) {
            assert.equal(err && err.message, 'Assertion error');
            done();
        });
    });
});
