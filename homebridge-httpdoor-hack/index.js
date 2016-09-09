// SUPER NASTY HACK
// supports an open and a close URL in the config file which I use to turn on or off
// a HomeSeer virtual device but since it uses the GarageDoorOpener service I can tell Siri
// to open or close the device.

var request = require("request");
var fs = require("fs");
var Service, Characteristic;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory("homebridge-httpdoor", "Httpdoor", DoorAccessory);
}

function DoorAccessory(log, config) {
	this.log = log;
	this.name = config["name"];
	this.openurl = config["openURL"];
	this.closeurl = config["closeURL"];

	this.garageservice = new Service.GarageDoorOpener(this.name);

	//this.garageservice
		//.getCharacteristic(Characteristic.CurrentDoorState)
		//.on('get', this.getState.bind(this));

	this.garageservice
		.getCharacteristic(Characteristic.TargetDoorState)
		//.on('get', this.getState.bind(this))
		.on('set', this.setState.bind(this));

	//this.garageservice
		//.getCharacteristic(Characteristic.ObstructionDetected)
		//.on('get', this.getState.bind(this));
}

DoorAccessory.prototype.getState = function(callback) {
	this.log("Getting current state...");

	request.get({
		url: this.statusurl
	}, function(err, response, body) {
		if (!err && response.statusCode == 200) {
			var json = JSON.parse(body);
			var state = json.state; // "open" or "closed"
			this.log("Door state is %s", state);
			var closed = state == "closed"
			callback(null, closed); // success
		} else {
			this.log("Error getting state: %s", err);
			callback(err);
		}
	}.bind(this));
}

DoorAccessory.prototype.setState = function(state, callback) {
	var doorState = (state == Characteristic.TargetDoorState.CLOSED) ? "closed" : "open";
	this.log("Set state to %s", doorState);
	
        if (doorState == "closed") {
		actionurl = this.closeurl
	}
	else if (doorState == "open") {
		actionurl = this.openurl
	}
	else {
		this.log("Unrecognized doorState.")
	}
	
	request.get({
		url: actionurl
	}, function(err, response, body) {
		if (!err && response.statusCode == 200) {
			this.log("State change complete.");
			var currentState = (state == Characteristic.TargetDoorState.CLOSED) ? Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPEN;

			this.garageservice
			.setCharacteristic(Characteristic.CurrentDoorState, currentState);

			callback(null); // success
		} else {
			this.log("Error '%s' setting door state. Response: %s", err, body);
			callback(err || new Error("Error setting door state."));
		}
	}.bind(this));
},

DoorAccessory.prototype.getServices = function() {
	return [this.garageservice];
}
