'use strict';

var async = require('async');
var pick = require('lodash.pick');
var merge = require('lodash.merge');
var partial = require('lodash.partial');

var types = ['queues', 'exchanges', 'bindings'];
var validQueueOptions = [
    'exclusive', 'durable', 'autoDelete', 'arguments', 'messageTtl', 'expires',
    'deadLetterExchange', 'deadLetterRoutingKey', 'maxLength', 'maxPriority'
];

function assertStuff(channel, assertions, callback) {
    // Step 1, validate the assertions
    var assertsErr = validateAssertions(assertions);
    if (assertsErr) {
        return setImmediate(callback, assertsErr);
    }

    // Step 2, create partialed functions that holds the channel
    var asserters = {
        exchange: partial(assertExchange, channel),
        queue: partial(assertQueue, channel),
        binding: partial(assertBinding, channel)
    };

    // Step 3, assert the exchanges
    async.each(assertions.exchanges || [], asserters.exchange, function onExchangesAsserted(err) {
        if (err) {
            return callback(err);
        }

        // Step 4, assert the queues
        async.each(assertions.queues || [], asserters.queue, function onQueuesAsserted(queueErr) {
            if (queueErr) {
                return callback(queueErr);
            }

            // Step 5, assert the bindings
            async.each(assertions.bindings || [], asserters.binding, callback);
        });
    });
}

function assertExchange(channel, exchange, callback) {
    if (typeof exchange === 'string') {
        exchange = { name: exchange };
    }

    channel.assertExchange(
        exchange.name,
        exchange.type || 'fanout',
        exchange.options || {},
        callback
    );
}

function assertQueue(channel, queue, callback) {
    if (typeof queue === 'string') {
        queue = { name: queue };
    }

    var cb = callback;
    if (queue.binding) {
        cb = function onQueueAsserted(err, ok) {
            if (err) {
                return callback(err);
            }

            var binding = merge({ queue: ok.queue }, queue.binding);
            assertBinding(channel, binding, callback);
        };
    }

    channel.assertQueue(
        queue.name,
        pick(queue.options || {}, validQueueOptions),
        cb
    );
}

function assertBinding(channel, binding, callback) {
    channel.bindQueue(
        binding.queue,
        binding.exchange,
        binding.pattern || '',
        binding.arguments || {},
        callback
    );
}

function validateAssertions(assertions) {
    var i, type;
    for (i = 0; i < types.length; i++) {
        type = types[i];

        if (assertions[type] && !Array.isArray(assertions[type])) {
            return new TypeError('`assertions.' + type + '` must be an array or undefined');
        }
    }

    return false;
}

module.exports = assertStuff;
