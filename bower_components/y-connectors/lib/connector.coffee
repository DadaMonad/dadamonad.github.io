
class Connector

  constructor: ()->
    # is set to true when this is synced with all other connections
    @is_synced = false
    # true, iff the client is currently syncing
    @is_syncing = false
    # compute all of these functions when all connections are synced.
    @compute_when_synced = []
    # Peerjs Connections: key: conn-id, value: conn
    @connections = {}
    # Connections, that have been initialized, but have not been (fully) synced yet.
    @unsynced_connections = {}
    # List of functions that shall process incoming data
    @receive_handlers = []

    # whether this instance is bound to any y instance
    @is_bound_to_y = false
    # listeners for binding to y
    @when_bound_to_y_listeners = []
    # call these functions when the user id is set
    @on_user_id_set = []

  #
  # Execute f, when the user id is set
  #
  onUserIdSet: (f)->
    @on_user_id_set.push f

  #
  # Eventually, you must set the user id (a unique id among all clients)
  #
  setUserId: (@id)->
    for f in @on_user_id_set
      f(@id)
    null

  #
  # Execute a function _when_ we are connected. If not connected, wait until connected.
  # @param f {Function} Will be executed on the PeerJs-Connector context.
  #
  whenSynced: (args)->
    if args.constructore is Function
      args = [args]
    if @is_synced
      args[0].apply this, args[1..]
    else
      @compute_when_synced.push args

  #
  # Execute an function when a message is received.
  # @param f {Function} Will be executed on the PeerJs-Connector context. f will be called with (sender_id, broadcast {true|false}, message).
  #
  onReceive: (f)->
    @receive_handlers.push f

  #
  # Broadcast a message to all connected peers.
  # @param message {Object} The message to broadcast.
  #
  broadcast: (message)->
    throw new Error "You must implement broadcast!"

  #
  #
  #
  send: (peer_s, message)->
    throw new Error "You must implement send!"


  #
  # perform a sync with a specific user.
  #
  performSync: (user)->
    @send user,
      sync_step: "getHB"
      data: []
    hb = @getHB([]).hb
    _hb = []
    for o in hb
      _hb.push o
      if _hb.length > 30
        @send user,
          sync_step: "applyHB_"
          data: _hb
        _hb = []
    @send user,
      sync_step: "applyHB"
      data: _hb


  #
  # When a master node joined the room, perform this sync with him. It will ask the master for the HB,
  # and will broadcast his own HB
  #
  performSyncWithMaster: (user)->
    if not @is_syncing
      @is_syncing = true
      @send user,
        sync_step: "getHB"
        send_again: "true"
        data: []
      hb = @getHB([]).hb
      _hb = []
      for o in hb
        _hb.push o
        if _hb.length > 30
          @broadcast
            sync_step: "applyHB_"
            data: _hb
          _hb = []
      @broadcast
        sync_step: "applyHB"
        data: _hb
  #
  # You you are sure that all clients are synced, call this function.
  #
  setStateSynced: ()->
    @is_synced = true
    for f in @compute_when_synced
      f()
    null

  #
  # You received a raw message, and you know that it is intended for to Yjs. Then call this function.
  #
  receiveMessage: (sender, res)->
    if not res.sync_step?
      for f in @receive_handlers
        f sender, res
    else
      if res.sync_step is "getHB"
        data = @getHB([])
        hb = data.hb
        _hb = []
        for o in hb
          _hb.push o
          if _hb.length > 30
            @send sender,
              sync_step: "applyHB_"
              data: _hb
            _hb = []
        @send sender,
          sync_step: "applyHB"
          data: _hb
        if res.send_again?
          send_again = do (sv = data.state_vector)=>
            ()=>
              hb = @getHB(sv).hb
              @send sender,
                sync_step: "applyHB",
                data: hb
                sent_again: "true"
          setTimeout send_again, 3000
      else if res.sync_step is "applyHB"
        @applyHB(res.data)

        if res.sent_again? and not @is_synced
          @is_synced = true
          for f in @compute_when_synced
            f()
      else if res.sync_step is "applyHB_"
        @applyHB(res.data)


  # Currently, the HB encodes operations as JSON. For the moment I want to keep it
  # that way. Maybe we support encoding in the HB as XML in the future, but for now I don't want
  # too much overhead. Y is very likely to get changed a lot in the future
  #
  # Because we don't want to encode JSON as string (with character escaping, wich makes it pretty much unreadable)
  # we encode the JSON as XML.
  #
  # When the HB support encoding as XML, the format should look pretty much like this.

  # does not support primitive values as array elements
  parseMessageFromXml: (m)->
    parse_array = (node)->
      for n in node.children
        if n.getAttribute("isArray") is "true"
          parse_array n
        else
          parse_object n

    parse_object = (node)->
      json = {}
      for name, value  of node.attrs
        int = parseInt(value)
        if isNaN(int) or (""+int) isnt value
          json[name] = value
        else
          json[name] = int
      for n in node.children
        name = n.name
        if n.getAttribute("isArray") is "true"
          json[name] = parse_array n
        else
          json[name] = parse_object n
      json
    parse_object m

  # encode message in xml
  # we use string because Strophe only accepts an "xml-string"..
  # So {a:4,b:{c:5}} will look like
  # <y a="4">
  #   <b c="5"></b>
  # </y>
  # m - ltx element
  # json - guess it ;)
  #
  encodeMessageToXml: (m, json)->
    # attributes is optional
    encode_object = (m, json)->
      for name,value of json
        if not value?
          # nop
        else if value.constructor is Object
          encode_object m.c(name), value
        else if value.constructor is Array
          encode_array m.c(name), value
        else
          m.setAttribute(name,value)
      m
    encode_array = (m, array)->
      m.setAttribute("isArray","true")
      for e in array
        if e.constructor is Object
          encode_object m.c("array-element"), e
        else
          encode_array m.c("array-element"), e
      m
    if json.constructor is Object
      encode_object m.c("y",{xmlns:"http://y.ninja/connector-stanza"}), json
    else if json.constructor is Array
      encode_array m.c("y",{xmlns:"http://y.ninja/connector-stanza"}), json
    else
      throw new Error "I can't encode this json!"

  whenBoundToY: (f)->
    if @is_bound_to_y
      f()
    else
      @when_bound_to_y_listeners.push f

  setIsBoundToY: ()->
    for f in @when_bound_to_y_listeners
      f()
    @is_bound_to_y = true


module.exports = Connector
