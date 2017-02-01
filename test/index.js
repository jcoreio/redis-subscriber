import {expect} from 'chai'
import redis from 'redis-mock'
import sinon from 'sinon'

import RedisSubscriber from '../src'

describe('RedisSubscriber', () => {
  let clients = []

  function createClient() {
    const client = redis.createClient()
    clients.push(client)
    return client
  }

  afterEach(() => {
    clients.forEach(client => client.end())
    clients = []
  })

  describe('subscriptions', () => {
    it('does nothing when there are no callbacks', done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client)
      subscriber.subscribe('foo', () => {})
      subscriber._subs = new Map()
      publisher.publish('foo', 'hello')
      publisher.publish('bar', 'world')
      setTimeout(done, 20)
    })
    it('applies parseMessage option if given', done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client, {parseMessage: JSON.parse})
      const spy = sinon.spy()
      subscriber.subscribe('foo', spy)
      publisher.publish('foo', {hello: 'world'})
      setTimeout(() => {
        expect(spy.args).to.deep.equal([
          ['foo', {hello: 'world'}],
        ])
        done()
      }, 20)
    })
    it('calls correct subscribe callbacks', done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client)
      const spy1 = sinon.spy()
      const spy2 = sinon.spy()
      subscriber.subscribe('foo', spy1)
      subscriber.subscribe('bar', spy1)
      subscriber.subscribe('bar', spy2)
      publisher.publish('foo', 'hello')
      publisher.publish('bar', 'world')
      setTimeout(() => {
        expect(spy1.args).to.deep.equal([
          ['foo', 'hello'],
          ['bar', 'world'],
        ])
        expect(spy2.args).to.deep.equal([
          ['bar', 'world'],
        ])
        done()
      }, 20)
    })
    it("doesn't call subscribe callbacks after they unsubscribe", done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client)
      const spy1 = sinon.spy()
      const spy2 = sinon.spy()
      subscriber.subscribe('foo', spy1)
      subscriber.subscribe('bar', spy2)
      const unsubscribe = subscriber.subscribe('bar', spy1)
      unsubscribe()
      subscriber.unsubscribe('bar', spy2)
      publisher.publish('foo', 'hello')
      publisher.publish('bar', 'world')
      setTimeout(() => {
        expect(spy1.args).to.deep.equal([
          ['foo', 'hello'],
        ])
        expect(spy2.args).to.deep.equal([])
        done()
      }, 20)
    })
  })
  describe('psubscriptions', () => {
    it('does nothing when there are no callbacks', done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client)
      subscriber.psubscribe('foo/*', () => {})
      subscriber._subs = new Map()
      publisher.publish('foo', 'hello')
      publisher.publish('bar', 'world')
      setTimeout(done, 20)
    })
    it('applies parseMessage option if given', done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client, {parseMessage: JSON.parse})
      const spy = sinon.spy()
      subscriber.psubscribe('foo/*', spy)
      publisher.publish('foo/bar', {hello: 'world'})
      setTimeout(() => {
        expect(spy.args).to.deep.equal([
          ['foo/*', 'foo/*', {hello: 'world'}],
        ])
        done()
      }, 20)
    })
    it('calls correct subscribe callbacks', done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client)
      const spy1 = sinon.spy()
      const spy2 = sinon.spy()
      subscriber.psubscribe('foo/*', spy1)
      subscriber.psubscribe('bar/*', spy1)
      subscriber.psubscribe('bar/*', spy2)
      publisher.publish('foo/bar', 'hello')
      publisher.publish('bar/foo', 'world')
      setTimeout(() => {
        // right now redis-mock doesn't handle this properly so these aren't the true correct values
        expect(spy1.args).to.deep.equal([
          ['foo/*', 'foo/*', 'hello'],
          ['bar/*', 'bar/*', 'world'],
        ])
        expect(spy2.args).to.deep.equal([
          ['bar/*', 'bar/*', 'world'],
        ])
        done()
      }, 20)
    })
    it("doesn't call subscribe callbacks after they unsubscribe", done => {
      const client = createClient()
      const publisher = createClient()
      const subscriber = new RedisSubscriber(client)
      const spy1 = sinon.spy()
      const spy2 = sinon.spy()
      subscriber.psubscribe('foo/*', spy1)
      subscriber.psubscribe('bar/*', spy2)
      const unsubscribe = subscriber.psubscribe('bar/*', spy1)
      unsubscribe()
      subscriber.punsubscribe('bar/*', spy2)
      publisher.publish('foo/bar', 'hello')
      publisher.publish('bar/foo', 'world')
      setTimeout(() => {
        // right now redis-mock doesn't handle this properly so these aren't the true correct values
        expect(spy1.args).to.deep.equal([
          ['foo/*', 'foo/*', 'hello'],
        ])
        expect(spy2.args).to.deep.equal([])
        done()
      }, 20)
    })
  })
  describe('unsubscribe', () => {
    it('does nothing when there are no subscriptions', () => {
      const client = createClient()
      const subscriber = new RedisSubscriber(client)
      const spy = sinon.spy()
      subscriber.unsubscribe('foo', spy)
      expect(subscriber._subs.size).to.equal(0)
    })
  })
  describe('punsubscribe', () => {
    it('does nothing when there are no subscriptions', () => {
      const client = createClient()
      const subscriber = new RedisSubscriber(client)
      const spy = sinon.spy()
      subscriber.punsubscribe('foo/*', spy)
      expect(subscriber._psubs.size).to.equal(0)
    })
  })
  it('clears subs when redis connection ends', done => {
    const client = createClient()
    const subscriber = new RedisSubscriber(client)
    subscriber.subscribe('foo')
    subscriber.psubscribe('bar/*')
    expect(subscriber._subs.size).to.be.above(0)
    expect(subscriber._psubs.size).to.be.above(0)
    let ended = false
    client.on('end', () => {
      if (!ended) {
        ended = true
        expect(subscriber._subs.size).to.equal(0)
        expect(subscriber._psubs.size).to.equal(0)
        done()
      }
    })
    client.end()
  })
})

