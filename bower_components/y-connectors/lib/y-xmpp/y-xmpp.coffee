
NXMPP = require "node-xmpp-client"
ltx = require "ltx"

extract_resource_from_jid = (jid)->
  jid.split("/")[1]

extract_bare_from_jid = (jid)->
  jid.split("/")[0]

Connector = require '../connector'


# This Handler handles a set of connections
class XMPPHandler
  #
  # See documentation for parameters
  #
  constructor: (opts = {})->
    # Initialize NXMPP.Client
    @rooms = {}
    if opts.node_xmpp_client?
      @xmpp = opts.node_xmpp_client
    else
      if opts.defaultRoomComponent?
        @defaultRoomComponent = opts.defaultRoomComponent
      else
        @defaultRoomComponent = "@conference.yatta.ninja"

      creds = {}
      if opts.jid?
        creds.jid = opts.jid
        creds.password = opts.password
      else
        creds.jid = '@yatta.ninja'
        creds.preferred = 'ANONYMOUS'

      if opts.host?
        creds.host = opts.host
        creds.port = opts.port
      else
        opts.websocket ?= 'wss:yatta.ninja:5281/xmpp-websocket'
        creds.websocket =
          url: opts.websocket

      @xmpp = new NXMPP.Client creds

    # What happens when you go online
    @is_online = false
    @connections = {}
    @when_online_listeners = []
    @xmpp.on 'online', =>
      @setIsOnline()
    @xmpp.on 'stanza', (stanza)=>
      # when a stanza is received, send it to the corresponding connector
      room = extract_bare_from_jid stanza.getAttribute "from"
      if @rooms[room]?
        @rooms[room].onStanza(stanza)


    @debug = false

  # Execute a function when xmpp is online (if it is not yet online, wait until it is)
  whenOnline: (f)->
    if @is_online
      f()
    else
      @when_online_listeners.push f

  # @xmpp is online from now on. Therefore this executed all listeners that depend on this event
  setIsOnline: ()->
    for f in @when_online_listeners
      f()
    @is_online = true

  #
  # Join a specific room
  #
  join: (room)->
    if not room?
      throw new Error "you must specify a room!"
    if room.indexOf("@") is -1
      room += @defaultRoomComponent
    if not @rooms[room]?
      room_conn = new XMPPConnector()
      @rooms[room] = room_conn
      @whenOnline ()=>
        # login to room
        # Want to be like this:
        # <presence from='a33b9758-62f8-42e1-a827-83ef04f887c5@yatta.ninja/c49eb7fb-1923-42f2-9cca-4c97477ea7a8' to='thing@conference.yatta.ninja/c49eb7fb-1923-42f2-9cca-4c97477ea7a8' xmlns='jabber:client'>
        # <x xmlns='http://jabber.org/protocol/muc'/></presence>
        room_conn.whenBoundToY ()=>
          room_conn.setUserId @xmpp.jid.resource
          room_conn.room = room # set the room jid
          room_conn.room_jid = room + "/" + @xmpp.jid.resource # set your jid in the room
          room_conn.xmpp = @xmpp
          room_conn.xmpp_handler = @
          room_subscription = new ltx.Element 'presence',
              to: room_conn.room_jid
            .c 'x', {}
          @xmpp.send room_subscription

    @rooms[room]

class XMPPConnector extends Connector

  #
  # closes a connection to a room
  #
  exit: ()->
    @xmpp.send new ltx.Element 'presence',
      to: @room_jid
      type: "unavailable"
    delete @xmpp_handler.rooms[@room]

  onStanza: (stanza)->
    sender = stanza.getAttribute "from"
    if stanza.is "presence"
      # a new user joined or leaved the room
      sender_role = stanza.getChild("x","http://jabber.org/protocol/muc#user").getChild("item").getAttribute("role")
      if sender is @room_jid
        # this client in received information, that it successfully joined the room
        @role = sender_role
        if @role is "moderator"
          # this client created this room, therefore there is (should be) nobody to sync to
          @setStateSynced()
      else if stanza.getAttribute("type") is "unavailable"
        # a user left the room
        delete @connections[extract_resource_from_jid sender]
      else
        # a user joined the room
        @connections[extract_resource_from_jid sender] = sender
        if not @is_synced and sender_role is "moderator"
          @performSyncWithMaster sender
    else
      # it is some message that was sent into the room (could also be a private chat or whatever)
      if sender is @room_jid
        return true
      res = stanza.getChild "y", "http://y.ninja/connector-stanza"
      # could be some simple text message (or whatever)
      if res?
        # this is definitely a message intended for Yjs
        @receiveMessage(sender, @parseMessageFromXml res)

    if @debug
      console.log "RECEIVED: "+stanza.toString()

  send: (user, json, type = "message")->
    # do not send y-operations if not synced,
    # send sync messages though
    if @is_synced or json.sync_step? or @is_syncing
      m = new ltx.Element "message",
        to: user
        type: if type? then type else "chat"
      message = @encodeMessageToXml(m, json)
      if @debug
        console.log "SENDING: "+message.toString()
      @xmpp.send message

  broadcast: (json)->
    @send @room, json, "groupchat"


if module.exports?
  module.exports = XMPPHandler

if window?
  if not Y?
    throw new Error "You must import Y first!"
  else
    Y.XMPP = XMPPHandler
