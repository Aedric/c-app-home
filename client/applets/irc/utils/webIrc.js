/*
 * WebSockets IRC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * Includes VT100.js from:
 *   http://code.google.com/p/sshconsole
 * Which was modified from:
 *   http://fzort.org/bi/o.php#vt100_js
 * IRC Client protocol:
 *   http://www.faqs.org/rfcs/rfc2812.html   
 */
import { VT100 } from './VT100.js';
function Util () {
}

Util.Debug = function (str) {
    console.log(str);
}

Util.Info = function (str) {
    console.log(str);
}

export function IRC(target, connect_callback, disconnect_callback) {

var that = {},  // Public API interface
    vt100, ws, sQ = [],
    state = "unconnected",
    irc_nick, irc_channel,
    termType = "VT100";


Array.prototype.pushStr = function (str) {
    var n = str.length;
    for (var i=0; i < n; i++) {
        this.push(str.charCodeAt(i));
    }
}

function do_send() {
    if (sQ.length > 0) {
        Util.Debug("Sending " + sQ);
        ws.send(sQ);
        sQ = [];
    }
}

function do_recv() {
    console.log(">> do_recv");
    var rQ, rQi, i;

    while (ws.rQlen() > 1) {
        rQ = ws.get_rQ();
        rQi = ws.get_rQi();
        for (i = rQi; i < rQ.length; i++) {
            if (rQ[i] === 10) {
                break;
            }
        }
        if (i >= rQ.length) {
            // No line break found
            break;
        }
        recvMsg(ws.rQshiftStr((i-rQi) + 1));
    }
    //console.log("<< do_recv");
}

// Handle an IRC message
function recvMsg(msg) {
    Util.Debug(">> recvMsg('" + msg + "')");

    var tokens = msg.split(' '), in_params = true,
        prefix, command, params = [], trailing = [];

    Util.Info("   tokens: " + tokens);

    if (tokens[0].charAt(0) === ":") {
        prefix = tokens.shift();
    }

    command = tokens.shift();

    while (tokens.length > 0) {
        if (tokens[0].charAt(0) === ":") {
            in_params = false;
        }
        if (in_params) {
            params.push(tokens.shift());
        } else {
            trailing.push(tokens.shift());
        }
    }

    Util.Info("   prefix: " + prefix);
    Util.Info("   command: " + command);
    Util.Info("   params: " + params);
    Util.Info("   trailing: " + trailing);

    // Show raw received
    vt100.write(msg);

    switch (command) {
    case "004":
        state = "registered";
        vt100.write("Joining channel #" + irc_channel);
        sendCmd("JOIN #" + irc_channel);
        break;
    case "JOIN":
        state = "joined";
        vt100.write("Joined channel #" + irc_channel);
        break;
        
    }

    Util.Debug("<< recvMsg('" + msg + "')");
}

function sendCmd(msg) {
    Util.Info("Sending: " + msg);
    sQ.pushStr(msg + "\r\n");
    do_send();
}

that.sendMsg = function(msg) {
    // TODO parse into message
    sendCmd("PRIVMSG #" + irc_channel + " :" + msg);
}


that.connect = function(host, port, encrypt, nick, channel) {
    var host = host,
        port = port,
        scheme = "ws://", uri;

    irc_nick = nick;
    irc_channel = channel;

    Util.Debug(">> connect");
    if ((!host) || (!port)) {
        alert("must set host and port");
        return false;
    }

    if (ws) {
        ws.close();
    }

    if (encrypt) {
        scheme = "wss://";
    }
    uri = scheme + host + ":" + port;
    Util.Info("connecting to " + uri);

    ws.open(uri);

    Util.Debug("<< connect");

    return true;
}

that.disconnect = function() {
    Util.Debug(">> disconnect");
    if (ws) {
        ws.close();
    }

    disconnect_callback();
    Util.Debug("<< disconnect");
}


function constructor() {
    /* Initialize Websock object */
    ws = new Websock();

    ws.on('message', do_recv);
    ws.on('open', function(e) {
        Util.Info(">> WebSockets.onopen");
        // Send registration commands
        state = "connected";
        sendCmd("NICK " + irc_nick);
        // TODO: how to determine this?
        sendCmd("USER joelm 0 * :Joel Martin");
        connect_callback();
        Util.Info("<< WebSockets.onopen");
    });
    ws.on('close', function(e) {
        Util.Info(">> WebSockets.onclose");
        that.disconnect();
        Util.Info("<< WebSockets.onclose");
    });
    ws.on('error', function(e) {
        Util.Info(">> WebSockets.onerror");
        that.disconnect();
        Util.Info("<< WebSockets.onerror");
    });

    /* Initialize the terminal emulator/renderer */

    vt100 = new VT100(80, 24, target);

    // Show cursor
    vt100.curs_set(true, false);

    /*
     * Override VT100 I/O routines
     */

    // Set handler for sending characters
    vt100.getch(
        function send_chr(chr, vt) {
            var i;
            Util.Debug(">> send_chr: " + chr);
            for (i = 0; i < chr.length; i++) {
                sQ.push(chr.charCodeAt(i));
            }
            do_send();
            vt100.getch(send_chr);
        }
    );

    vt100.debug = function(message) {
        Util.Debug(message + "\n");
    }

    vt100.warn = function(message) {
        Util.Warn(message + "\n");
    }

    vt100.curs_set = function(vis, grab, eventist)
    {
        this.debug("curs_set:: vis: " + vis + ", grab: " + grab);
        if (vis !== undefined)
            this.cursor_vis_ = (vis > 0);
    }

    return that;
}

return constructor(); // Return the public API interface

} // End of Telnet()

/*
 * Websock: high-performance binary WebSockets
 * Copyright (C) 2012 Joel Martin
 * Licensed under MPL 2.0 (see LICENSE.txt)
 *
 * Websock is similar to the standard WebSocket object but with extra
 * buffer handling.
 *
 * Websock has built-in receive queue buffering; the message event
 * does not contain actual data but is simply a notification that
 * there is new data available. Several rQ* methods are available to
 * read binary data off of the receive queue.
 */

/* [module]
 * import Util from "./util";
 */

/*jslint browser: true, bitwise: true */
/*global Util*/

/* [module] export default */ function Websock() {
    "use strict";

    this._websocket = null;  // WebSocket object

    this._rQi = 0;           // Receive queue index
    this._rQlen = 0;         // Next write position in the receive queue
    this._rQbufferSize = 1024 * 1024 * 4; // Receive queue buffer size (4 MiB)
    this._rQmax = this._rQbufferSize / 8;
    // called in init: this._rQ = new Uint8Array(this._rQbufferSize);
    this._rQ = null; // Receive queue

    this._sQbufferSize = 1024 * 10;  // 10 KiB
    // called in init: this._sQ = new Uint8Array(this._sQbufferSize);
    this._sQlen = 0;
    this._sQ = null;  // Send queue

    this._eventHandlers = {
        'message': function () {},
        'open': function () {},
        'close': function () {},
        'error': function () {}
    };
};

(function () {
    "use strict";
    // this has performance issues in some versions Chromium, and
    // doesn't gain a tremendous amount of performance increase in Firefox
    // at the moment.  It may be valuable to turn it on in the future.
    var ENABLE_COPYWITHIN = false;

    var MAX_RQ_GROW_SIZE = 40 * 1024 * 1024;  // 40 MiB

    var typedArrayToString = (function () {
        // This is only for PhantomJS, which doesn't like apply-ing
        // with Typed Arrays
        try {
            var arr = new Uint8Array([1, 2, 3]);
            String.fromCharCode.apply(null, arr);
            return function (a) { return String.fromCharCode.apply(null, a); };
        } catch (ex) {
            return function (a) {
                return String.fromCharCode.apply(
                    null, Array.prototype.slice.call(a));
            };
        }
    })();

    Websock.prototype = {
        // Getters and Setters
        get_sQ: function () {
            return this._sQ;
        },

        get_rQ: function () {
            return this._rQ;
        },

        get_rQi: function () {
            return this._rQi;
        },

        set_rQi: function (val) {
            this._rQi = val;
        },

        // Receive Queue
        rQlen: function () {
            return this._rQlen - this._rQi;
        },

        rQpeek8: function () {
            return this._rQ[this._rQi];
        },

        rQshift8: function () {
            return this._rQ[this._rQi++];
        },

        rQskip8: function () {
            this._rQi++;
        },

        rQskipBytes: function (num) {
            this._rQi += num;
        },

        // TODO(directxman12): test performance with these vs a DataView
        rQshift16: function () {
            return (this._rQ[this._rQi++] << 8) +
                   this._rQ[this._rQi++];
        },

        rQshift32: function () {
            return (this._rQ[this._rQi++] << 24) +
                   (this._rQ[this._rQi++] << 16) +
                   (this._rQ[this._rQi++] << 8) +
                   this._rQ[this._rQi++];
        },

        rQshiftStr: function (len) {
            if (typeof(len) === 'undefined') { len = this.rQlen(); }
            var arr = new Uint8Array(this._rQ.buffer, this._rQi, len);
            this._rQi += len;
            return typedArrayToString(arr);
        },

        rQshiftBytes: function (len) {
            if (typeof(len) === 'undefined') { len = this.rQlen(); }
            this._rQi += len;
            return new Uint8Array(this._rQ.buffer, this._rQi - len, len);
        },

        rQshiftTo: function (target, len) {
            if (len === undefined) { len = this.rQlen(); }
            // TODO: make this just use set with views when using a ArrayBuffer to store the rQ
            target.set(new Uint8Array(this._rQ.buffer, this._rQi, len));
            this._rQi += len;
        },

        rQwhole: function () {
            return new Uint8Array(this._rQ.buffer, 0, this._rQlen);
        },

        rQslice: function (start, end) {
            if (end) {
                return new Uint8Array(this._rQ.buffer, this._rQi + start, end - start);
            } else {
                return new Uint8Array(this._rQ.buffer, this._rQi + start, this._rQlen - this._rQi - start);
            }
        },

        // Check to see if we must wait for 'num' bytes (default to FBU.bytes)
        // to be available in the receive queue. Return true if we need to
        // wait (and possibly print a debug message), otherwise false.
        rQwait: function (msg, num, goback) {
            var rQlen = this._rQlen - this._rQi; // Skip rQlen() function call
            if (rQlen < num) {
                if (goback) {
                    if (this._rQi < goback) {
                        throw new Error("rQwait cannot backup " + goback + " bytes");
                    }
                    this._rQi -= goback;
                }
                return true; // true means need more data
            }
            return false;
        },

        // Send Queue

        flush: function () {
            if (this._websocket.bufferedAmount !== 0) {
                Util.Debug("bufferedAmount: " + this._websocket.bufferedAmount);
            }

            if (this._sQlen > 0 && this._websocket.readyState === WebSocket.OPEN) {
                this._websocket.send(this._encode_message());
                this._sQlen = 0;
            }
        },

        send: function (arr) {
            this._sQ.set(arr, this._sQlen);
            this._sQlen += arr.length;
            this.flush();
        },

        send_string: function (str) {
            this.send(str.split('').map(function (chr) {
                return chr.charCodeAt(0);
            }));
        },

        // Event Handlers
        off: function (evt) {
            this._eventHandlers[evt] = function () {};
        },

        on: function (evt, handler) {
            this._eventHandlers[evt] = handler;
        },

        _allocate_buffers: function () {
            this._rQ = new Uint8Array(this._rQbufferSize);
            this._sQ = new Uint8Array(this._sQbufferSize);
        },

        init: function () {
            this._allocate_buffers();
            this._rQi = 0;
            this._websocket = null;
        },

        open: function (uri, protocols) {
            var ws_schema = uri.match(/^([a-z]+):\/\//)[1];
            this.init();

            // IE, Edge and Firefox misbehave when protocols is
            // undefined, converting it to a string rather than
            // treating it as if it wasn't specified
            if (protocols) {
                this._websocket = new WebSocket(uri, protocols);
            } else {
                this._websocket = new WebSocket(uri);
            }
            this._websocket.binaryType = 'arraybuffer';

            this._websocket.onmessage = this._recv_message.bind(this);
            this._websocket.onopen = (function () {
                Util.Debug('>> WebSock.onopen');
                if (this._websocket.protocol) {
                    Util.Info("Server choose sub-protocol: " + this._websocket.protocol);
                }

                this._eventHandlers.open();
                Util.Debug("<< WebSock.onopen");
            }).bind(this);
            this._websocket.onclose = (function (e) {
                Util.Debug(">> WebSock.onclose");
                this._eventHandlers.close(e);
                Util.Debug("<< WebSock.onclose");
            }).bind(this);
            this._websocket.onerror = (function (e) {
                Util.Debug(">> WebSock.onerror: " + e);
                this._eventHandlers.error(e);
                Util.Debug("<< WebSock.onerror: " + e);
            }).bind(this);
        },

        close: function () {
            if (this._websocket) {
                if ((this._websocket.readyState === WebSocket.OPEN) ||
                        (this._websocket.readyState === WebSocket.CONNECTING)) {
                    Util.Info("Closing WebSocket connection");
                    this._websocket.close();
                }

                this._websocket.onmessage = function (e) { return; };
            }
        },

        // private methods
        _encode_message: function () {
            // Put in a binary arraybuffer
            // according to the spec, you can send ArrayBufferViews with the send method
            return new Uint8Array(this._sQ.buffer, 0, this._sQlen);
        },

        _expand_compact_rQ: function (min_fit) {
            var resizeNeeded = min_fit || this._rQlen - this._rQi > this._rQbufferSize / 2;
            if (resizeNeeded) {
                if (!min_fit) {
                    // just double the size if we need to do compaction
                    this._rQbufferSize *= 2;
                } else {
                    // otherwise, make sure we satisy rQlen - rQi + min_fit < rQbufferSize / 8
                    this._rQbufferSize = (this._rQlen - this._rQi + min_fit) * 8;
                }
            }

            // we don't want to grow unboundedly
            if (this._rQbufferSize > MAX_RQ_GROW_SIZE) {
                this._rQbufferSize = MAX_RQ_GROW_SIZE;
                if (this._rQbufferSize - this._rQlen - this._rQi < min_fit) {
                    throw new Exception("Receive Queue buffer exceeded " + MAX_RQ_GROW_SIZE + " bytes, and the new message could not fit");
                }
            }

            if (resizeNeeded) {
                var old_rQbuffer = this._rQ.buffer;
                this._rQmax = this._rQbufferSize / 8;
                this._rQ = new Uint8Array(this._rQbufferSize);
                this._rQ.set(new Uint8Array(old_rQbuffer, this._rQi));
            } else {
                if (ENABLE_COPYWITHIN) {
                    this._rQ.copyWithin(0, this._rQi);
                } else {
                    this._rQ.set(new Uint8Array(this._rQ.buffer, this._rQi));
                }
            }

            this._rQlen = this._rQlen - this._rQi;
            this._rQi = 0;
        },

        _decode_message: function (data) {
            // push arraybuffer values onto the end
            var u8 = new Uint8Array(data);
            if (u8.length > this._rQbufferSize - this._rQlen) {
                this._expand_compact_rQ(u8.length);
            }
            this._rQ.set(u8, this._rQlen);
            this._rQlen += u8.length;
        },

        _recv_message: function (e) {
            try {
                this._decode_message(e.data);
                if (this.rQlen() > 0) {
                    this._eventHandlers.message();
                    // Compact the receive queue
                    if (this._rQlen == this._rQi) {
                        this._rQlen = 0;
                        this._rQi = 0;
                    } else if (this._rQlen > this._rQmax) {
                        this._expand_compact_rQ();
                    }
                } else {
                    Util.Debug("Ignoring empty message");
                }
            } catch (exc) {
                var exception_str = "";
                if (exc.name) {
                    exception_str += "\n    name: " + exc.name + "\n";
                    exception_str += "    message: " + exc.message + "\n";
                }

                if (typeof exc.description !== 'undefined') {
                    exception_str += "    description: " + exc.description + "\n";
                }

                if (typeof exc.stack !== 'undefined') {
                    exception_str += exc.stack;
                }

                if (exception_str.length > 0) {
                    Util.Error("recv_message, caught exception: " + exception_str);
                } else {
                    Util.Error("recv_message, caught exception: " + exc);
                }

                if (typeof exc.name !== 'undefined') {
                    this._eventHandlers.error(exc.name + ": " + exc.message);
                } else {
                    this._eventHandlers.error(exc);
                }
            }
        }
    };
})();


