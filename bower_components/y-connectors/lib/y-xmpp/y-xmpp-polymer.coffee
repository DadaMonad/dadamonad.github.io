XMPPConnector = require './y-xmpp'

new Polymer 'y-xmpp',
  ready: ()->
    if not @room?
      throw new Error "You must define a room attribute in the xmpp-connector!!"
    this.connector = new XMPPConnector(@room)
    if @debug?
      this.connector.debug = @debug
