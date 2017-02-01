# redis-subscriber

[![Build Status](https://travis-ci.org/jcoreio/redis-subscriber.svg?branch=master)](https://travis-ci.org/jcoreio/redis-subscriber)
[![Coverage Status](https://coveralls.io/repos/github/jcoreio/redis-subscriber/badge.svg?branch=master)](https://coveralls.io/github/jcoreio/redis-subscriber?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Subscribe specific callbacks to specific channels on the same redis client

## Usage

```js
import redis from 'redis'
import RedisSubscriber from '@jcoreio/redis-subscriber'

const client = redis.createClient()
const subscriber = new RedisSubscriber(client)
```

### Subscribing
```js
subscriber.subscribe('foo', (channel, message) => ...)
subscriber.psubscribe('foo/*', (pattern, channel, message) => ...)
```

### Unsubscribing
There are two ways to unsubscribe:
* call `unsubscribe` or `punsubscribe`
  ```js
  const onMessage = (channel, message) => ...
  const onPMessage = (pattern, channel, message) => ...
  subscriber.subscribe('foo', onMessage)
  subscriber.psubscribe('foo/*', onPMessage)
  ...
  subscriber.unsubscribe('foo', onMessage)
  subscriber.unsubscribe('foo/*', onPMessage)
  ```
* call the function returned by `subscribe` or `psubscribe`
  ```js
  const unsubscribe = subscriber.subscribe('foo', onMessage)
  unsubscribe()
  ```
  ```js
  const unsubscribe = subscriber.psubscribe('foo/*', onPMessage)
  unsubscribe()
  ```

### `parseMessage` option

Parse all messages as JSON before sending them to callbacks:

```js
const subscriber = new RedisSubscriber(client, {parseMessage: JSON.parse})
```

