(function() {
  arduino = function(options) {
    var controller;
    var sockets;
    var stateCallback
    var digital = [];
    var analog = [];
    var arduinoDataSet = {
      'uno': { pinsDigital: 14, pinsAnalog: 6 },
      'diecimila': { pinsDigital: 14, pinsAnalog: 6 },
      'due': { pinsDigital: 54, pinsAnalog: 12 },
      'mega': { pinsDigital: 54, pinsAnalog: 16 },
      'leonardo': { pinsDigital: 20, pinsAnalog: 12 },
    };

    (function(options) {
      var pinsDigital = 14;
      var pinsAnalog = 6;

      if (options) {
        if (options.controller) {
          setControlHandler(options.controller);
        }
        if (options.socketio) {
          setControlSockets(options.socketio);
        }
        if (options.board) {
          pinsDigital = arduinoDataSet[options.board].pinsDigital;
          pinsAnalog = arduinoDataSet[options.board].pinsAnalog;
        }
      }
      //
      for(var d=0;d<pinsDigital;++d) {
        prepareDigitalPin(d, true);
      }    

      for(var a=0;a<pinsAnalog;++a) {
        prepareAnalogPin(a);
      }
    })(options);

    function setControlHandler(ctrl) {
      controller = ctrl;
    }

    function setControlSockets(socks) {
      sockets = socks;
    }

    function onStateChange(cb) {
      stateCallback = cb;
    }

    function getDigitalPinCount() {
      return digital.length;
    }

    function getAnalogPinCount() {
      return analog.length;
    }
    
    function onConnectAsHost(socket) {
      // Called when the arduino recieves an instruction to change
      socket.on('arduino::inout', function(msg){
        var data = JSON.parse(msg);
        prepareDigitalPin(data.pin, data.asinput);
      });

      socket.on('arduino::write', function(msg){
        var data = JSON.parse(msg);
        write(data.pin, data.state);
      });
    }
    
    function onConnectAsClient(socket) {
      // When the client recieves an message from the Arduino...
      socket.on('arduino::state', function(msg){
        var data = JSON.parse(msg);

        for(var i=0;i<data.digital.length;++i) {
          gVars.arduino.applyStateDigital(i, data.digital[i]);
        }

        for(var i=0;i<data.analog.length;++i) {
          gVars.arduino.applyStateAnalog(i, data.analog[i]);
        }

        stateCallback && stateCallback(data);
      });
    }

    function prepareDigitalPin(pin, asinput) {
      digital[pin] = {};
      digital[pin].asinput = asinput;
      digital[pin].state = false;

      if (!controller) {
        return false;
      }

      if (asinput) {
         digital[pin].handle = new controller.Button(pin); // http://johnny-five.io/api/button/
         digital[pin].handle.on("down", function() {
           applyStateDigital(pin, true);
           sendState();
        });
        digital[pin].handle.on("up", function() {
          applyStateDigital(pin, false);
          sendState();
        });

      } else { //output
        digital[pin].handle = new controller.Led(pin); // http://johnny-five.io/api/led/
      }

      return true;
  }


    function prepareAnalogPin(pin) {
      analog[pin] = {};
      analog[pin].value = 0;

      if (!controller) {
        return;
      }

      analog[pin].handle = new controller.Sensor({pin: "A"+pin, freq:256}); //http://johnny-five.io/api/sensor/
      analog[pin].handle.on("data", function() {
        applyStateAnalog(pin, this.value);
        sendState();
      });
    }

    function write(pin, state) {
      if (pin < 0 || pin >= getDigitalPinCount()) {
        return false;
      }

      if (digital[pin].asinput) {
        // nop
      } else if (state) {
         digital[pin].handle && digital[pin].handle.on();
         digital[pin].state = true;
      } else {
         digital[pin].handle && digital[pin].handle.off();
         digital[pin].state = false;
      }
      return true;
    }

// todo; state for bool, value for analog
    function sendState() {
      if (!sockets) {
        return;
      }
      var state = { v:1, digital: [], analog: [] };
      for(var d=0;d<digital.length;++d) {
        state.digital[d] = digital[d].state;
      }
    
      for(var a=0;a<analog.length;++a) {
        state.analog[a] = analog[a].value;
      }
      sockets.emit('arduino::state', JSON.stringify(state), { for: 'everyone' });
    }

    function isDigitalInput(pin) {
      return digital[pin].asinput;
    }

    function getStateDigital(pin) {
      return digital[pin].state;
    }

    function getStateAnalog(pin) {
      return analog[pin].value;
    }

    function applyStateDigital(pin, state) {
      digital[pin].state = state;
    }

    function applyStateAnalog(pin, value) {
      analog[pin].value = value;
    }

    // Client => Host (e.g. browser to Arduino)
    function transmitDigitalState(pin, state) {
      sockets.emit('arduino::write', JSON.stringify({pin:pin, state: state}), { for: 'everyone' });
    }
    
    function transmitDigitalDirection(pin, isInput) {
      digital[pin].asinput = isInput;
      sockets.emit('arduino::inout', JSON.stringify({pin:pin, asinput: isInput}), { for: 'everyone' });
    }

    return {
      // Common
      getDigitalPinCount,
      getAnalogPinCount,
      getStateDigital,
      getStateAnalog,
      isDigitalInput,
      applyStateDigital,
      applyStateAnalog,

      // Device side
      onConnectAsHost,
      write,
      prepareAnalogPin,
      prepareDigitalPin,
      sendState,

      // Web-side
      onConnectAsClient,
      onStateChange,
      transmitDigitalState,
      transmitDigitalDirection,
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = arduino;
  else
    window.arduino = arduino;
})();
