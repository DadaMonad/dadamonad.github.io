
XMPP = require "node-xmpp-client"
ltx = require "ltx"

extract_resource_from_jid = (jid)->
  jid.split("/")[1]

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
parse_message = (m)->
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
# <yatta a="4">
#   <b c="5"></b>
# </yatta>
# m - ltx element
# json - guess it ;)
#
encode_message = (m, json)->
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
    encode_object m.c("yatta",{xmlns:"http://yatta.ninja/connector-stanza"}), json
  else if json.constructor is Array
    encode_array m.c("yatta",{xmlns:"http://yatta.ninja/connector-stanza"}), json
  else
    throw new Error "I can't encode this json!"


class XMPPConnector extends Connector
  constructor: (room)->
    super()
    @xmpp = new XMPP.Client
      jid: '@yatta.ninja'
      preferred: "ANONYMOUS"
      websocket:
        url: 'wss:yatta.ninja:5281/xmpp-websocket'

    @_is_server = true
    @is_syncing = false

    @connections = {}
    that = @
    @xmpp.on 'online', ->
      # login to room
      # Want to be like this:
      # <presence from='a33b9758-62f8-42e1-a827-83ef04f887c5@yatta.ninja/c49eb7fb-1923-42f2-9cca-4c97477ea7a8' to='thing@conference.yatta.ninja/c49eb7fb-1923-42f2-9cca-4c97477ea7a8' xmlns='jabber:client'>
      # <x xmlns='http://jabber.org/protocol/muc'/></presence>
      that.room = room + "@conference.yatta.ninja"
      that.room_jid = that.room + "/" + that.xmpp.jid.resource
      that.id = that.xmpp.jid.resource
      for f in that.when_user_id_set
        f(that.id)
      room_subscription = new ltx.Element 'presence',
          to: that.room_jid
        .c 'x', {}
      that.xmpp.send room_subscription

    @xmpp.on 'stanza', (stanza)->
      sender = stanza.getAttribute "from"
      if stanza.is "presence"
        sender_role = stanza.getChild("x","http://jabber.org/protocol/muc#user").getChild("item").getAttribute("role")
        if sender is that.room_jid
          that.role = sender_role
          if that.role is "moderator"
            # this client created this room, therefore there is (should be) nobody to sync to
            that.is_synced = true
        else if stanza.getAttribute("type") is "unavailable"
          delete that.connections[extract_resource_from_jid sender]
        else
          that.connections[extract_resource_from_jid sender] = sender
          if not @is_synced and sender_role is "moderator"
            that._performSync sender
      else
        if sender is that.room_jid
          return true
        res = stanza.getChild "yatta", "http://yatta.ninja/connector-stanza"
        that.receive_counter ?= 0
        that.receive_counter++
        # could be some simple text message
        if res?
          res = parse_message res
          if not res.sync_step?
            for f in that.receive_handlers
              f sender, res
          else
            data = that.sync_process_order[res.sync_step+1](res.data)
            if res.sync_step + 2 < that.sync_process_order.length
              that._send sender,
                sync_step: res.sync_step + 1
                data: data
              if res.send_again?
                send_again = do (old_data = data, sync_step = res.sync_step)->
                  ()->
                    data = that.sync_process_order[res.sync_step+1](data.state_vector)
                    that._send sender,
                      sync_step: sync_step + 1
                      data: data
                      sent_again: "true"
                setTimeout send_again, 3000
            if res.sent_again? and not that.is_synced
              that.is_synced = true
              for f in that.compute_when_synced
                f()
      console.log "RECEIVED: "+stanza.toString()

  _send: (user, json, type)->
    # do not send yatta-operations if not synced,
    # send sync messages though
    if @is_synced or json.sync_step? or @is_syncing
      @send_conter ?= 0
      @send_conter++
      m = new ltx.Element "message",
        to: user
        type: if type? then type else "chat"
      message = encode_message(m, json)
      console.log "SENDING: "+message.toString()
      @xmpp.send message

  _broadcast: (json)->
    @_send @room, json, "groupchat"

  invokeSync: ()->

  _performSync: (user)->
    if not @is_syncing
      @is_syncing = true
      @_send user,
        sync_step: @sync_process_order.length-3
        send_again: "true"
        data: []

      @_broadcast
        sync_step: @sync_process_order.length-2
        data: @sync_process_order[@sync_process_order.length-2]([])

if module.exports?
  module.exports = XMPPConnector

if window?
  window.XMPPConnector = XMPPConnector




