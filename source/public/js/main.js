'use strict';

var gVars = {};

function SGXPrepare_OS() {
  sgxskeleton.PrepareLoadingPage();

  new sgx.main.System();

  sgx.graphics.Engine.create(960,680);  // the size of the draw area we (as programmers) will use

  sgx.main.System.writePage();
  sgx.main.System.initialize();  // optionally pass the 'loading_screen' ID here, to hide the contents once loaded

  // Application-specific initialisation
  var socket = io();
  gVars.arduino = new arduino({board:'uno', socketio:socket});//TODO: pass in socket???
  gVars.arduino.onConnectAsClient(socket);
}

function SGXinit() {
  gVars.texture = {};

  gVars.texture.uno = sgx.graphics.TextureManager.get().load("images/arduino_uno");
  gVars.texture.digital = sgx.graphics.TextureManager.get().load("images/digital");
  gVars.texture.analogEmpty = sgx.graphics.TextureManager.get().load("images/analog_empty");
  gVars.texture.analogFull = sgx.graphics.TextureManager.get().load("images/analog_full");
  gVars.texture.numbers = sgx.graphics.TextureManager.get().load("images/numbers");
  gVars.texture.inout = sgx.graphics.TextureManager.get().load("images/inout");
}

function SGXstart() {
}


function getDigitalPinRect(pin) {
  var y = 30;
  var x = pin < 8 ? (881 - pin * 32) : (601 - (pin-8)*32);
  return new sgxRect2f(x, y, 18, 18);
}

function getDigitalPinInOutRect(pin) {
  var y = 4;
  var x = pin < 8 ? (881 - pin * 32) : (601 - (pin-8)*32);
  return new sgxRect2f(x, y, 18, 25);
}

function SGXupdate(telaps) {

  if (sgx.input.Engine.get().mouseLeft.wasPressed()) {
    var mx = sgx.input.Engine.get().mouseX;
    var my = sgx.input.Engine.get().mouseY;

    var pins = gVars.arduino.getDigitalPinCount();
    for(var i=0;i<pins;++i) {
      if (getDigitalPinRect(i).isInside(mx, my) && !gVars.arduino.isDigitalInput(i)) {
        var newState = !gVars.arduino.getStateDigital(i);
        gVars.arduino.transmitDigitalState(i, newState);
      } else if (getDigitalPinInOutRect(i).isInside(mx, my)) {
        var newDirectionIn = !gVars.arduino.isDigitalInput(i);
        gVars.arduino.transmitDigitalDirection(i, newDirectionIn);
      }
    }
  }
}

function SGXdraw() {
  var pSurface = sgx.graphics.DrawSurfaceManager.get().getDisplaySurface();

  pSurface.setFillColor(sgx.ColorRGBA.White);  
  pSurface.setFillTexture(gVars.texture.uno);
  pSurface.fillPoint(0, 0, CSGXDrawSurface.eFromTopLeft);
  
  // digital
  for(var pin=0;pin< gVars.arduino.getDigitalPinCount();++pin) {
    var region = gVars.arduino.getStateDigital(pin) ? 1 : 0;
    var y = 30;
    var x = pin < 8 ? (881 - pin * 32) : (601 - (pin-8)*32);
    pSurface.setFillTexture(gVars.texture.digital, region);  
    pSurface.fillPoint(x, y, CSGXDrawSurface.eFromTopLeft);
    //
    pSurface.setFillTexture(gVars.texture.inout, gVars.arduino.isDigitalInput(pin) ? 0 : 1);  
    pSurface.fillPoint(x, y-30, CSGXDrawSurface.eFromTopLeft);
  }
  // analog
  for(var pin=0;pin<gVars.arduino.getAnalogPinCount();++pin) {
    var height = gVars.texture.analogEmpty.getHeight();
    var y = 666;
    var x = 722 + pin * 32;
    pSurface.setFillTexture(gVars.texture.analogEmpty);  
    pSurface.fillPoint(x, y-height, CSGXDrawSurface.eFromTopLeft);
    //
    var value = gVars.arduino.getStateAnalog(pin);
    var prop = (height * value) / 1024;
    prop = sgxFloor(prop);
    gVars.texture.analogFull.clearRegions();
    gVars.texture.analogFull.addPixelRegion(0, height-prop, 20, height);
    pSurface.setFillTexture(gVars.texture.analogFull);  
    pSurface.fillPoint(x, y - prop, CSGXDrawSurface.eFromTopLeft);

    // The numerals
    x += 9;
    y -= height - 7;
    pSurface.setFillTexture(gVars.texture.numbers);
    do {
      pSurface.setFillTextureRegion(value % 10);
      pSurface.fillPoint(x, y);
      y += 12;

      value = sgxFloor(value / 10);
    } while (value);
  }
}
