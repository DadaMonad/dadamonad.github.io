(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global Y */
'use strict'

function extend (Y) {
  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      if (options.io == null) {
        throw new Error('You must define the socketio serve!')
      }
      options.role = 'slave'
      super(y, options)
      this.options = options
      this.io = options.io
      this.setUserId('server')
    }
    disconnect () {
      throw new Error('You must not disconnect with this connector!')
    }
    reconnect () {
      throw new Error('You must not disconnect with this connector!')
    }
    send (uid, message) {
      this.io.to(uid).emit('yjsEvent', message)
    }
    broadcast (message) {
      this.io.in(this.options.room).emit('yjsEvent', message)
    }
    isDisconnected () {
      return false
    }
  }
  Y.extend('websockets-server', Connector)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}

},{}]},{},[1])


//# sourceMappingURL=y-websockets-server.js.map