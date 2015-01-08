XMPPConnector = require './xmpp-connector'

new Polymer 'xmpp-connector',
  ready: ()->
    console.log("now initializing")
    this.connector = new XMPPConnector(@room)
