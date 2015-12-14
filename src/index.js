'use strict';

var async = require('async');
var pick = require('lodash.pick');
var pluck = require('lodash.pluck');
var merge = require('lodash.merge');
var partial = require('lodash.partial');

var types = ['queues', 'exchanges', 'bindings'];
var validQueueOptions = [
    'exclusive', 'durable', 'autoDelete', 'arguments', 'messageTtl', 'expires',
    'deadLetterExchange', 'deadLetterRoutingKey', 'maxLength', 'maxPriority'
];

/**
 * Assert that the passed queues, exchanges and bindings exist
 *
 * @param {AmqpChannel} channel    Amqp channel to use for asserting
 * @param {Object}      assertions An object of assertions to perform. Valid keys are:
 *                                 `queues`, `exchanges` and `bindings`, and must be arrays.
 * @param {Function}    callback   Function to call once the assertions have been completed
 */
function assertStuff(channel, assertions, callback) {
    // Step 1, validate the assertions
    var assertsErr = validateAssertions(assertions);
    if (assertsErr) {
        setImmediate(callback, assertsErr);
        return;
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
        async.map(assertions.queues || [], asserters.queue, function onQueuesAsserted(queueErr, queues) {
            if (queueErr) {
                return callback(queueErr);
            }

            // Pluck the queue names from assert results
            queues = pluck(queues, 'queue');

            // Step 5, assert the bindings
            async.each(assertions.bindings || [], asserters.binding, function onBindingsAsserted(bindErr) {
                callback(bindErr, queues);
            });
        });
    });
}

/**
 * Assert that an exchange exists (create it if non-existant)
 *
 * @param {AmqpChannel}   channel  Amqp channel to use for asserting the exchange
 * @param {Object|String} exchange Object containing the `name`, `type` and an optional object of `options` to use.
 *                                 If no `type` is given, it will default to `fanout`.
 * @param {Function}      callback Function to call once the exchange has been asserted
 */
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

/**
 * Assert that a queue exists (create it if non-existant)
 *
 * @param {AmqpChannel}   channel  Amqp channel to use for asserting the queue
 * @param {Object|String} queue    Object containing the `name` and an optional object of `options` to use
 * @param {Function}      callback Function to call once the queue has been asserted
 */
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
            assertBinding(channel, binding, function onBindingAsserted(bindErr) {
                callback(bindErr, ok);
            });
        };
    }

    channel.assertQueue(
        queue.name,
        pick(queue.options || {}, validQueueOptions),
        cb
    );
}

/**
 * Bind a queue to an exchange
 *
 * @param {AmqpChannel} channel  Amqp channel to use for binding
 * @param {Object}      binding  Object containing `queue` and `exchange` names to bind.
 *                               Also supports `pattern` and an object of optional `arguments`.
 * @param {Function}    callback Function to call once the binding has been completed
 */
function assertBinding(channel, binding, callback) {
    channel.bindQueue(
        binding.queue,
        binding.exchange,
        binding.pattern || '',
        binding.arguments || {},
        callback
    );
}

/**
 * Validate that the assertions given are arrays
 *
 * @param  {Object} assertions
 * @return {Boolean|Error}
 */
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
