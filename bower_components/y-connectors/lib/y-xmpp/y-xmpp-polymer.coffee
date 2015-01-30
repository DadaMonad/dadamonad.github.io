XMPP = require './y-xmpp'

new Polymer 'y-xmpp',
  xmpp: new XMPP(), # this is a shared property indeed!
  ready: ()->
    if not @room?
      throw new Error "You must define a room attribute in the xmpp-connector!!"
    this.connector = @xmpp.join(@room)
    if @debug?
      this.connector.debug = @debug
