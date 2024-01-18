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
	var shipsList = []
	for(var ship in jsonData.data) {
		if (jsonData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
			shipsList.push(jsonData.data[ship]['name']);
			return shipsList; //we have a match, we can exit right now!
		} else if (jsonData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase()))
		{
			shipsList.push(jsonData.data[ship]['name']);
		}
	}	
	return shipsList;
}

function getNbLoc(shipName,type) {
	var nbLocs = 0
	for(var ship in jsonData.data) {
		for (var loc in jsonData.data[ship][type + '_at']) {
			if (jsonData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
				nbLocs = nbLocs + 1
			}
		}
	}
	return nbLocs;
}


function getShipPrice(shipName,type) {
	var listShips = getShipList(shipName);
	var nbShips = listShips.length;
	var message = '';
	if (listShips.length == 1) {
		var nbLocs = getNbLoc(listShips[0],type);
		console.log('Looking for \'' + listShips[0] + '\' and found ' + nbLocs + ' locations');
		var message = '';
		if (nbLocs == 0)
		{
			var message = 'Le ' + listShips[0] + ' n\'est pas disponible à l\'achat en jeu.';
		} else {
			for(var ship in jsonData.data) {
				var locID = 1;
				if (jsonData.data[ship]['name'].toLowerCase() == listShips[0].toLowerCase()) 
				{
					console.log('Found ship \'' + listShips[0] + '\'');
					for (var loc in jsonData.data[ship][type + '_at']) 
					{
						console.log(nbLocs + '/' + locID);
						var apiShipName = jsonData.data[ship]['name'];
						var locSystemName = jsonData.data[ship][type + '_at'][loc]['system_name'];
						var locCityName = jsonData.data[ship][type + '_at'][loc]['city_name'];
						if (locCityName == undefined)
							locCityName = jsonData.data[ship][type + '_at'][loc]['tradeport'];								
						var locStoreName = '(' + jsonData.data[ship][type + '_at'][loc]['store_name'] + ')';
						if (locStoreName == '()')
							locStoreName = '';	
						var apiShipPrice = jsonData.data[ship][type + '_at'][loc]['price'].toLocaleString('en-US') + ' aUEC'
						if (nbLocs == 1)
						{
							
							message = 'Le ' + apiShipName + ' est disponible dans ' + locSystemName + ' à ' + locCityName + ' ' + locStoreName + ' au prix de ' + apiShipPrice;
							locID = locID + 1;
						}
						else if (nbLocs > 1)
						{
							if (locID == 1) {
								message = message = 'Le ' + apiShipName + ' est disponible dans ' + locSystemName + ' à ' + locCityName + ' ' + locStoreName + ' au prix de ' + apiShipPrice;
								locID = locID + 1;
							} else if (locID == nbLocs)
							{
								message = message + ' et dans ' + locSystemName + ' à ' + locCityName + ' ' + locStoreName + ' au prix de ' + apiShipPrice;
							} else {
								message = message + ', il est aussi disponible dans ' + locSystemName + ' à ' + locCityName + ' ' + locStoreName + ' au prix de ' + apiShipPrice;
								locID = locID + 1
							}
						}
						console.log(message);
					}
					
				}
			}
		}
		
	} else if (listShips.length > 1 && listShips.length < 10) {
		message = 'Désolé, vous devez sélectionner un seul ship ' + listShips;
	} else if (listShips.length >= 10){
		message = 'Désolé, j\'ai trouvé trop de ships correspondant à ce nom (' + listShips.length + ')';
	} else {
		message = 'Désolé, je n\'ai trouvé aucun ship correspondant à ce nom. Je ne saurais que vous conseiller d\'acheter un Carrack!';
	}
	return message
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
 
  if (msg.substr(0,1) == '!') // Do we have a command ?
  {
	  const posDelim = msg.indexOf(' ');
	  if (posDelim != -1)
	  {
		  const commandName = msg.substr(0,posDelim).trim();
		  const commandArgs = msg.substr(posDelim,msg.length - posDelim).trim();
		  
		  // If the command is known, let's execute it
		  if (commandName.toLowerCase() == '!shiprent') 
		  {
			  const res = getShipPrice(commandArgs,'rent')
			  if (res != undefined) {
				client.say(target, res);
			  }
		  } else if (commandName.toLowerCase() == '!shipbuy')
		  {
			  const res = getShipPrice(commandArgs,'buy')
			  if (res != undefined) {
				client.say(target, res);
			  }
		  }
	  } else {
		  const commandName = msg.trim();
		  if (commandName == '!shipbuy')
		  {
			client.say(target, commandName +' <nom> : veuillez entrer le nom du ship');
		  } else if (commandName == '!shiprent')
		  {
			client.say(target, commandName +' <nom> : veuillez entrer le nom du ship');
		  } else if (commandName == '!dumpapi')
		  {
			  fs.writeFile("jsonData.json", JSON.stringify(jsonData), (err) => {
			  if (err)
				console.log(err);
			  else {
				console.log("File written successfully\n");

			  }
			});
		  }
	  }
	  

  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}