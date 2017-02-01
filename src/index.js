// @flow

import type {RedisClient} from 'redis'
import createDebug from 'debug'

type SubCallback<M> = (channel: string, message: M) => any
type PSubCallback<M> = (pattern: string, channel: string, message: M) => any

type Options<M> = {
  parseMessage?: (message: string) => M,
}

const debug = createDebug('redis-subscriber')

/**
 * The redis client sends all subscribed events to any callback.  This keeps track of which
 * callbacks are associated with which subscriptions and sends each event to only those callbacks
 * that are subscribed for it.
 *
 * This also automatically JSON.parses all messages.
 */
export default class RedisSubscriber<M> {
  _redis: RedisClient

  _subs: Map<string, Set<SubCallback<M>>> = new Map()
  _psubs: Map<string, Set<PSubCallback<M>>> = new Map()

  /**
   * Starts the redis client
   */
  constructor(redis: RedisClient, {parseMessage}: Options<M> = {}) {
    debug('created')

    this._redis = redis

    this._redis.on('ready', () => debug('ready'))
    // istanbul ignore next
    this._redis.on('error', error => debug(error.stack))

    this._redis.on('message', (channel: string, message: string) => {
      debug('message', channel, message)
      const callbacks = this._subs.get(channel)
      debug(callbacks ? callbacks.size : 0, 'callbacks found')
      if (!callbacks) return
      const parsedMessage = parseMessage ? parseMessage(message) : message
      callbacks.forEach(callback => callback(channel, (parsedMessage: any)))
    })
    this._redis.on('pmessage', (pattern: string, channel: string, message: string) => {
      debug('pmessage', pattern, channel, message)
      const callbacks = this._psubs.get(pattern)
      debug(callbacks ? callbacks.size : 0, 'callbacks found')
      if (!callbacks) return
      const parsedMessage = parseMessage ? parseMessage(message) : message
      callbacks.forEach(callback => callback(pattern, channel, (parsedMessage: any)))
    })
    this._redis.on('end', () => {
      debug('end')
      this._subs = new Map()
      this._psubs = new Map()
    })
  }

  /**
   * Subscribes a callback to the given channel
   * @returns {function(): *} an unsubscribe function
   */
  subscribe(channel: string, callback: SubCallback<M>): () => void {
    let callbacks = this._subs.get(channel)
    if (!callbacks) {
      callbacks = new Set()
      this._subs.set(channel, callbacks)
      this._redis.subscribe(channel)
    }
    callbacks.add(callback)
    debug('subscribe %s (%d)', channel, callbacks.size)
    return () => this.unsubscribe(channel, callback)
  }

  /**
   * Subscribes a callback to the given pattern
   * @returns {function(): *} an unsubscribe function
   */
  psubscribe(pattern: string, callback: PSubCallback<M>): () => void {
    let callbacks = this._psubs.get(pattern)
    if (!callbacks) {
      callbacks = new Set()
      this._psubs.set(pattern, callbacks)
      this._redis.psubscribe(pattern)
    }
    callbacks.add(callback)
    debug('psubscribe %s (%d)', pattern, callbacks.size)
    return () => this.punsubscribe(pattern, callback)
  }

  /**
   * Unsubscribes a callback from the given channel
   */
  unsubscribe(channel: string, callback: SubCallback<M>) {
    let callbacks = this._subs.get(channel)
    debug('unsubscribe %s (%d)', channel, callbacks ? callbacks.size : 0)
    if (!callbacks) return
    callbacks.delete(callback)
    if (!callbacks.size) {
      this._subs.delete(channel)
      this._redis.unsubscribe(channel)
    }
  }

  /**
   * Unsubscribes a callback from the given pattern
   */
  punsubscribe(pattern: string, callback: PSubCallback<M>) {
    let callbacks = this._psubs.get(pattern)
    debug('punsubscribe %s (%d)', pattern, callbacks ? callbacks.size : 0)
    if (!callbacks) return
    callbacks.delete(callback)
    if (!callbacks.size) {
      this._psubs.delete(pattern)
      this._redis.punsubscribe(pattern)
    }
  }
}

