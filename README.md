[![npm version](http://img.shields.io/npm/v/gleipnir-assert.svg?style=flat-square)](http://browsenpm.org/package/gleipnir-assert)[![Build Status](http://img.shields.io/travis/rexxars/gleipnir-assert/master.svg?style=flat-square)](https://travis-ci.org/rexxars/gleipnir-assert)[![Coverage Status](http://img.shields.io/codeclimate/coverage/github/rexxars/gleipnir-assert.svg?style=flat-square)](https://codeclimate.com/github/rexxars/gleipnir-assert)[![Code Climate](http://img.shields.io/codeclimate/github/rexxars/gleipnir-assert.svg?style=flat-square)](https://codeclimate.com/github/rexxars/gleipnir-assert/)

# gleipnir-assert

Gleipnir module that asserts exchanges, queues and bindings

## Installation

```
npm install gleipnir-assert
```

## Usage

If you're using `gleipnir`, this functionality is already baked in. Simply pass `assert` to the options when constructing it:

```js
var gleipnir = require('gleipnir');

var client = gleipnir({
    url: 'amqp://some:user@localhost',
    assert: {
        queues: [
            { name: 'foo' },
            { name: 'bar', options: { exclusive: true } }
        ],
        exchanges: [
            { name: 'some-tasks', type: 'topic' },
            { name: 'other-tasks', type: 'fanout' }
        ],
        bindings: [
            { queue: 'foo', exchange: 'other-tasks' }
        ]
    }
});
```

If you just use the [amqplib](https://github.com/squaremo/amqp.node) lib directly, you can use it like this:

```js
var gleipnirAssert = require('gleipnir-assert');

gleipnirAssert(someAmqpChannel, assertions, function(err) {
    // Remember to check for errors!
    if (err) {
        throw err;
    }

    // Good to go!
});
```

## License

MIT-licensed. See LICENSE.
