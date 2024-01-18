import tmi from 'tmi.js';
import fetch from 'node-fetch';
import fs from 'node:fs';

let rawdata = fs.readFileSync('settings.json');
let config = JSON.parse(rawdata);

// Define configuration options
const ship_url = 'https://portal.uexcorp.space/api/ships';

const api_settings = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
	'api_key': config.api_key
  },
};

const twitch_options = {
  identity: {
    'username': config.username,
    'password': config.password
  },
  channels: config.channels
};

const shipData = await fetch(ship_url,api_settings);
var jsonData = await shipData.json();
// console.log(jsonData);
// Create a client with our options
const client = new tmi.client(twitch_options);
 
// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

function getNbShip(shipName) {
	var nbShips = 0
	for(var ship in jsonData.data) {
			if (jsonData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
				return 1;
			} else if (jsonData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase())) {
				nbShips = nbShips + 1
			}
	}
	return nbShips;
}

function getShipList(shipName) {
	var shipsList = ''
	for(var ship in jsonData.data) {
		if (jsonData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase()) || jsonData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
			if (shipsList == '') {
				shipsList = jsonData.data[ship]['name']
			} else {
				shipsList = shipsList + ', ' + jsonData.data[ship]['name']
			}
		}
	}	
	return shipsList;
}

function getNbLoc(shipName) {
	var nbLocs = 0
	for(var ship in jsonData.data) {
		for (var loc in jsonData.data[ship]['buy_at']) {
			if (jsonData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase()) || jsonData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
				nbLocs = nbLocs + 1
			}
		}
	}
	return nbLocs;
}


function getShipPrice(shipName) {
	var nbShips = getNbShip(shipName);
	var message = 'Je ne sais pas!!'
	console.log('Found ' + nbShips);
	if (nbShips == 1) {
		var nbLocs = getNbLoc(shipName);
		var message = 'Le ' + getShipList(shipName) + ' n\'est pas disponible à l\'achat en jeu.'
		for(var ship in jsonData.data) {
			var locID = 1;
			
			for (var loc in jsonData.data[ship]['buy_at']) {
				if (jsonData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase()) || jsonData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
					if (nbLocs == 1)
					{
						message = 'Le ' + jsonData.data[ship]['name'] + ' est disponible dans ' + jsonData.data[ship]['buy_at'][loc]['system_name'] + ' à ' + jsonData.data[ship]['buy_at'][loc]['city_name'] + ' (' + jsonData.data[ship]['buy_at'][loc]['store_name'] + ') au prix de ' + jsonData.data[ship]['buy_at'][loc]['price'].toLocaleString('en-US') + ' aUEC';
						locID = locID + 1;
					}
					else if (nbLocs > 1)
					{
						if (locID == 1) {
							message = 'Le ' + jsonData.data[ship]['name'] + ' est disponible dans ' + jsonData.data[ship]['buy_at'][loc]['system_name'] + ' à ' + jsonData.data[ship]['buy_at'][loc]['city_name'] + ' (' + jsonData.data[ship]['buy_at'][loc]['store_name'] + ') au prix de ' + jsonData.data[ship]['buy_at'][loc]['price'].toLocaleString('en-US') + ' aUEC';
							locID = locID + 1;
						} else if (locID == nbLocs)
						{
							message = message + ' et dans ' + jsonData.data[ship]['buy_at'][loc]['system_name'] + ' à ' + jsonData.data[ship]['buy_at'][loc]['city_name'] + ' (' + jsonData.data[ship]['buy_at'][loc]['store_name'] + ') au prix de ' + jsonData.data[ship]['buy_at'][loc]['price'].toLocaleString('en-US') + ' aUEC'
						} else {
							message = message + ', il est aussi disponible dans ' + jsonData.data[ship]['buy_at'][loc]['system_name'] + ' à ' + jsonData.data[ship]['buy_at'][loc]['city_name'] + ' (' + jsonData.data[ship]['buy_at'][loc]['store_name'] + ') au prix de ' + jsonData.data[ship]['buy_at'][loc]['price'].toLocaleString('en-US') + ' aUEC'
							locID = locID + 1
						}
					}
				}
			}
		}
		
	} else if (nbShips > 1 && nbShips < 10) {
		message = 'Désolé, il va falloir être plus précis ' + getShipList(shipName);
	} else {
		message = 'Désolé, je ne sais pas';
	}
	return message
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  // console.log(msg);
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.substr(0,msg.indexOf(' ')).trim();
  const commandArgs = msg.substr(msg.indexOf(' '),msg.length - msg.indexOf(' ')).trim();
  
  // If the command is known, let's execute it
  if (commandName.toLowerCase() == '!ship') {
	  const res = getShipPrice(commandArgs)
	  if (res != undefined) {
		client.say(target, res);
	  }
  } else if (commandName.toLowerCase() == '!api') {
	  console.log(jsonData.data)
  } else {
    console.log(`* Unknown command ${commandName.toLowerCase()}`);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}