###
Parameters:
(String) nick - The nick name used in the chat room.
(String) message - The Json object you want to encode
Returns:
msgiq - the unique id used to send the message
###
send_yatta_element = (room, nick, message)->
  append_nick = (room, nick)->
    node = Strophe.escapeNode(Strophe.getNodeFromJid(room))
    domain = Strophe.getDomainFromJid(room)
    node + "@" + domain + (if nick? then "/" + nick else "")
  type = if nick? then "chat" else "groupchat"
  room_nick = append_nick(room, nick)
  msgid = this.getUniqueId()
  msg = $msg(
      to: room_nick
      from: this.jid
      type: type
      id: msgid
    )
  window.message = message
  window.encoded_message = (new DOMParser()).parseFromString(message,"text/xml").querySelector("yatta")
  msg.cnode(window.encoded_message)
  msg.up().up()
  this.send(msg)
  msgid

Connector = require '../connector'

# Currently, the HB encodes operations as JSON. For the moment I want to keep it
# that way. Maybe we support encoding in the HB as XML in the future, but for now I don't want
# too much overhead. Yatta is very likely to get changed a lot in the future
#
# Because we don't want to encode JSON as string (with character escaping, wich makes it pretty much unreadable)
# we encode the JSON as XML.
#
# When the HB support encoding as XML, the format should look pretty much like this.

# does not support primitive values as array elements
parse_message = (message)->
  parse_array = (node)->
    for n in node.children
      if n.getAttribute("isArrayContainer") is "true"
        parse_array n
      else
        parse_object n

  parse_object = (node)->
    json = {}
    for attr in node.attributes
      int = parseInt(attr.value)
      if isNaN(int) or (""+int) isnt attr.value
        json[attr.name] = attr.value
      else
        json[attr.name] = int
    for n in node.children
      name = n.tagName.toLowerCase()
      if n.getAttribute("isArrayContainer") is "true"
        json[name] = parse_array n
      else
        json[name] = parse_object n
    json
  parse_object message.querySelector("yatta")

# encode message in xml
# we use string because Strophe only accepts an "xml-string"..
# So {a:4,b:{c:5}} will look like
# <yatta a="4">
#   <b c="5"></b>
# </yatta>
#
encode_message = (message)->
  # attributes is optional
  encode_object = (tagname, message, attributes)->
    enc_tag = "<"+tagname
    if attributes?
      enc_tag += " "+attributes
    enc_inner = ""
    for name,value of message
      if not value?
        # nop
      else if value.constructor is Object
        enc_inner += encode_object name, value
      else if value.constructor is Array
        enc_inner += encode_array name, value
      else
        enc_tag += " "+name+'="'+value+'"'
    enc_tag + ">"+enc_inner+"</"+tagname+">"
  encode_array = (tagname, message)->
    enc = "<"+tagname+' isArrayContainer="true">'
    for m in message
      if m.constructor is Object
        enc += encode_object "array-element", m
      else
        enc += encode_array "array-element", m
    enc += "</"+tagname+">"
  encode_object 'yatta', message, 'xmlns="http://yatta.ninja/connector-stanza"'

Strophe.log = (status, msg)->
  console.log("STROPHE: "+msg)

window.StrohpeConnector = class StrohpeConnector extends Connector

  constructor: (@room = "thing")->
    super()
    that = @
    @room = @room+"@conference.yatta.ninja"
    @unsynced_connections = {}

    # Create the Peerjs instance
    @xmpp = new Strophe.Connection('wss:yatta.ninja:5281/xmpp-websocket')
    @xmpp.send_yatta_element = send_yatta_element
    ##
    @xmpp.rawInput = (x)->
      console.log "Receive: "+x
    @xmpp.rawOutput = (x)->
      console.log "Send: "+x
    ##

    @xmpp.connect "yatta.ninja", "anonymous", (status)->
      if status is Strophe.Status.CONNECTED
        that.xmpp.muc.join that.room, that.xmpp.jid.split("/")[1]
        that.xmpp.muc.rooms[that.room].addHandler "presence", (presence,conn)->
          that.conn = conn
          that.connections = that.conn.roster
          that.id = that.conn.nick
          for f in that.when_user_id_set
            f(that.id)

          perform_when_synced = (sender)->
            delete that.unsynced_connections[sender]
            that.is_synced = true
            for comp in that.compute_when_synced
              comp[0].apply that, comp[1..]
            that.compute_when_synced = []
          that.conn.addHandler "message", (m)->
            sender = m.getAttribute("from").split("/")[1]
            if sender is that.conn.nick
              return true
            error_node = m.querySelector("error")
            if error_node?
              console.log "STROPHE: STANZA-ERROR: "+error_node.textContent
              # most probably the user to which you want to sync, is not available anymore
              # TODO: check if that is true error = "Recipient not in room"
              if wait_for_connections()
                that.conn.addHandler "presence", wait_for_connections # wait again - see down
              return true
            res = parse_message m
            console.log("received sth:"+(if res.sync_step? then  " - sync_step: " + res.sync_step else "") )
            console.dir(res.data)
            if res.sync_step?
              if res.sync_step + 1 < that.sync_process_order.length
                if (res.sync_step is 0) and (not that.unsynced_connections[sender]?) and (res.stamped isnt "true")
                  #TODO: do I need .call ?? (also in Peerjs connector)
                  that.xmpp.send_yatta_element that.room, sender, encode_message
                    sync_step: 0
                    data: that.sync_process_order[0].call that
                    stamped: true # The other collaborator already send a messege with sync_step = 0, we want to make shure, that he doesn't send it again
                if not that.unsynced_connections[sender]?
                  that.unsynced_connections[sender] = res.sync_step
                if (not that.unsynced_connections[sender]?) or that.unsynced_connections[sender] <= res.sync_step
                  # only compute if the sync_step is expected!
                  data = that.sync_process_order[res.sync_step+1].call that, res.data
                  if that.sync_process_order[res.sync_step+2]?
                    that.unsynced_connections[sender] = res.sync_step + 1
                    if that.is_synced
                      that.xmpp.send_yatta_element that.room, sender, encode_message
                        sync_step: res.sync_step+1
                        data: data
                    else
                      # All the changed of this client were generated offline (no sync until now)
                      # Lets broadcast the changes to _all_ the clients.
                      # But the clients must not renew their state vector if we do it like this
                      # TODO: Do I really want to do it like this?, If we really work offline (disconnect+reconnect), then
                      # this approach may lead to send the HB twice
                      #   - once in the room
                      #   - once to every client
                      # But, on the other hand, this may safe a _lot_ of messages under circumstances.
                      # Either way: TODO: define this approach in the Connector class. This approach is not generic!
                      data.state_vector = [] # Array, because of our special state-vector encoding
                      that.xmpp.send_yatta_element that.room, null, encode_message
                        sync_step: res.sync_step+1
                        data: data
                  else
                    perform_when_synced(sender)
              else
                perform_when_synced(sender)
            else
              for f in that.receive_handlers
                f sender, res.data
            true


          # getArbitraryConn that is not this user
          getArbitraryConn = ()->
            c_names = for n,user of that.connections
              user
            temp_length = c_names.length
            c_names = c_names.filter (n)->
              n.nick isnt that.conn.nick
            ###
            if temp_length is c_names.length
            # we havent removed the nick of this nick,
            # therefore, the stanza has not yet arrived
            # wait until it does arrive
            return null
            ###
            if c_names.length > 0
              c_names[Math.round(Math.random()*(c_names.length-1))].nick
            else
             null

          # wait for incoming conns, get arbitraryConn's until success
          wait_for_connections = ->
            arbitraryConn = getArbitraryConn()
            if arbitraryConn?
              if not that._isSyncing()
                that.unsynced_connections[arbitraryConn] = 0
                that.xmpp.send_yatta_element that.room, arbitraryConn, encode_message
                  sync_step: 0
                  data: that.sync_process_order[0].call that
              false
            else
              true
          # check if there are already users in the room, add to handler otherwise
          if wait_for_connections()
            that.conn.addHandler "presence", wait_for_connections

          that.whenSynced [->
              # When synced, perform a handshake with everyone
              # also every second * (number of users)
              handshake = ->
                that.xmpp.send_yatta_element that.room, null, encode_message
                 sync_step: 0
                 data: that.sync_process_order[0].call that
              handshake()
              # TODO: only perform when this user actually changed sth
              # TODO: actually implement sth like this
              # # # setInterval(handshake, 1000)
            ]
          false

  # true iff currently this client is syncing with another client
  _isSyncing: ()->
    exists_unsynced = false
    for c of @unsynced_connections
      exists_unsynced = true
      break
    exists_unsynced

  invokeSync: ()=>
    if @is_synced
      @xmpp.send_yatta_element @room, null, encode_message
        sync_step: 0
        data: @sync_process_order[0].call this

    # TODO: do error handling
    # TODO: you just can't save soo much (think of offline editing)
  _broadcast: (message)->
    if @conn?
      ###
      if @xmpp._proto.socket?
        # sometimes strophe throws an error because the socket does not exists_unsynced
        # This happens on the "idle" state in strophe
        # Checking for the existence of socket is just some bugfix!
        @xmpp.send_yatta_element @room, null, encode_message
          data: message
      else
      ###
      if @is_synced # and @xmpp._proto.socket?
        @xmpp.send_yatta_element @room, null, encode_message
          data: message
      # else
      #  @whenSynced [@_broadcast, message]

    ### also nice ..
    if @is_synced
      @xmpp.send_yatta_element @room, null, encode_message
        data: message
    else if @_isSyncing()
      @whenSynced [ ->
          @xmpp.send_yatta_element @room, null, encode_message
            data: message
        ]
    ###

  #
  # Send a message to a peer or set of peers. This is peerjs specific.
  # @overload _send(peerid, message)
  #   @param peerid {String} PeerJs connection id of _another_ peer
  #   @param message {Object} Some object that shall be send
  # @overload _send(peerids, message)
  #   @param peerids {Array<String>} PeerJs connection ids of _other_ peers
  #   @param message {Object} Some object that shall be send
  #
  _send: (peer_s, message)->
    if peer_s.constructor is [].constructor
      # Throw errors _after_ the message has been sent to all other peers.
      # Just in case a connection is invalid.
      errors = []
      for peer in peer_s
        try
          @xmpp.send_yatta_element @room, @connections[peer].nick, encode_message
            data: message
        catch error
          errors.push(error+"")
      if errors.length > 0
        throw new Error errors
    else
      @xmpp.send_yatta_element @room, @connections[peer_s].nick, encode_message
        data: message


