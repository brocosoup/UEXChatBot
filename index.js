import tmi from 'tmi.js';
import fetch from 'node-fetch';
import fs from 'node:fs';
import server from './server.cjs';
import { exit } from 'node:process';

function initJSONFile(file) {
	if (!fs.existsSync(file + '.json')) {
		fs.writeFileSync(file + '.json', fs.readFileSync(file + '-template.json'))
	}
}

initJSONFile('locale');
let rawlocale = fs.readFileSync('locale.json');
const locale = await JSON.parse(rawlocale);

initJSONFile('settings');
var config = JSON.parse(fs.readFileSync("settings.json"));
if (config.identity.password == undefined || config.identity.password == '' || (process.argv[2] && process.argv[2] === '-f')) {
	let profile = []
	server.runAuthServ();
	console.log('Waiting for auth: go now to http://<hostname>:3000 to continue');
	while (profile == '') {
		profile = server.getProfile()
		await new Promise(r => setTimeout(r, 2000));
	}
	config.identity.username = profile.data[0].display_name.toLowerCase();
	config.identity.password = 'oauth:' + profile.accessToken;
	if (config.channels[0] === '')
		config.channels = [profile.data[0].display_name.toLowerCase()];
	fs.writeFileSync("settings.json", JSON.stringify(config))
	server.close();
}

if (config.api_key == '') {
	if (!fs.existsSync('jsonCommoditiesData.json') || !fs.existsSync('jsonShipData.json') || !fs.existsSync('jsonTradeportsData.json')) {
		console.log('You have no api_key and no local files. I will now shutdown.');
		exit(2);
	} else {
		console.log('You UEX api_key is empty in settings.json, I will not update the data!');
	}
}

const api_settings = {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'api_key': config.api_key
	},
};

var jsonShipData = {};
var jsonCommoditiesData = {};
var jsonTradeportsData = {};

refreshAPI();

function refreshAPI() {
	let apicalls = [
		'https://portal.uexcorp.space/api/ships/',
		'https://portal.uexcorp.space/api/tradeports/system/ST/',
		'https://portal.uexcorp.space/api/commodities/'
	];
	let requests = apicalls.map(async function (url) {
		const response = await fetch(url, api_settings);
		return await response.json();
	});

	Promise.all(requests)
		.then((results) => {
			jsonShipData = results[0];
			if (jsonShipData['code'] == 200) {
				fs.writeFile("jsonShipData.json", JSON.stringify(jsonShipData), (err) => {
					if (err)
						console.log(err);
					else
						console.log("jsonShipData written successfully\n");
				});
			} else {
				var rawShipdata = fs.readFileSync('jsonShipData.json');
				jsonShipData = JSON.parse(rawShipdata);
				console.log('Using local data for jsonShipData');
			}

			jsonCommoditiesData = results[2];
			if (jsonCommoditiesData['code'] == 200) {
				fs.writeFile("jsonCommoditiesData.json", JSON.stringify(jsonCommoditiesData), (err) => {
					if (err)
						console.log(err);
					else
						console.log("jsonCommoditiesData written successfully\n");
				});
			} else {
				var rawCommoditiesdata = fs.readFileSync('jsonCommoditiesData.json');
				jsonCommoditiesData = JSON.parse(rawCommoditiesdata);
				console.log('Using local data for jsonCommoditiesData');
			}

			jsonTradeportsData = results[1];
			if (jsonTradeportsData['code'] == 200) {
				fs.writeFile("jsonTradeportsData.json", JSON.stringify(jsonTradeportsData), (err) => {
					if (err)
						console.log(err);
					else
						console.log("jsonTradeportsData written successfully\n");
				});
			} else {
				var rawTradeportsdata = fs.readFileSync('jsonTradeportsData.json');
				jsonTradeportsData = JSON.parse(rawTradeportsdata);
				console.log('Using local data for jsonTradeportsData');
			}
		}).catch(function(err) {
			console.log(err);
		})

}

// Connect to Twitch:
// Create a client with our options
const twitch_options = {
	identity: {
		'username': config.identity.username,
		'password': config.identity.password
	},
	channels: config.channels,
};

const client = new tmi.client(twitch_options);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

function computeMessage(message, table) {
	var computedMessage = message;
	var argID = 1;
	for (var arg in table) {
		// console.log(table[arg]);
		computedMessage = computedMessage.replace('%%' + argID, table[arg])
		// console.log(computedMessage);
		argID++;
	}
	return computedMessage;
}

function getShipList(shipName) {
	var shipsList = []
	for (var ship in jsonShipData.data) {
		if (jsonShipData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
			shipsList.push(jsonShipData.data[ship]['name']);
			return shipsList; //we have a match, we can exit right now!
		} else if (jsonShipData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase())) {
			shipsList.push(jsonShipData.data[ship]['name']);
		}
	}
	return shipsList;
}

function getNbLoc(shipName, type) {
	var nbLocs = 0
	for (var ship in jsonShipData.data) {
		for (var loc in jsonShipData.data[ship][type + '_at']) {
			if (jsonShipData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
				nbLocs = nbLocs + 1
			}
		}
	}
	return nbLocs;
}

function getShipPrice(shipName, type) {
	var listShips = getShipList(shipName);
	var nbShips = listShips.length;
	var message = '';
	if (listShips.length == 1) {
		var nbLocs = getNbLoc(listShips[0], type);
		// console.log('Looking for \'' + listShips[0] + '\' and found ' + nbLocs + ' locations');
		var message = '';
		if (nbLocs == 0) {
			// var message = 'Le ' + listShips[0] + ' n\'est pas disponible à l\'achat en jeu.';
			if (type == 'buy')
				var message = computeMessage(locale.ship_not_available_buy, [listShips[0]]);
			else if (type == 'rent')
				var message = computeMessage(locale.ship_not_available_rent, [listShips[0]]);
		} else {
			for (var ship in jsonShipData.data) {
				var locID = 1;
				if (jsonShipData.data[ship]['name'].toLowerCase() == listShips[0].toLowerCase()) {
					// console.log('Found ship \'' + listShips[0] + '\'');
					for (var loc in jsonShipData.data[ship][type + '_at']) {
						// console.log(nbLocs + '/' + locID);
						var apiShipName = jsonShipData.data[ship]['name'];
						var locSystemName = jsonShipData.data[ship][type + '_at'][loc]['system_name'];
						var locCityName = jsonShipData.data[ship][type + '_at'][loc]['city_name'];
						if (locCityName == undefined)
							locCityName = jsonShipData.data[ship][type + '_at'][loc]['tradeport'];
						var locStoreName = '(' + jsonShipData.data[ship][type + '_at'][loc]['store_name'] + ')';
						if (locStoreName == '(null)')
							locStoreName = '';
						var apiShipPrice = jsonShipData.data[ship][type + '_at'][loc]['price'].toLocaleString('en-US') + ' aUEC'
						if (nbLocs == 1) {

							// message = '(' + type + ') Le ' + apiShipName + ' est à ' + locSystemName + ' ' + locCityName + ' ' + locStoreName + ' au prix de ' + apiShipPrice;
							message = computeMessage(locale.ship_available_oneloc, [apiShipName, locSystemName, locCityName, locStoreName, apiShipPrice, type]);
							locID = locID + 1;
						}
						else if (nbLocs > 1) {
							if (locID == 1) {
								message = computeMessage(locale.ship_available_firstloc, [apiShipName, locSystemName, locCityName, locStoreName, apiShipPrice, type]);
								locID = locID + 1;
							} else if (locID == nbLocs) {
								message = message + computeMessage(locale.ship_available_lastloc, [apiShipName, locSystemName, locCityName, locStoreName, apiShipPrice, type]);
							} else {
								message = message + computeMessage(locale.ship_available_nextloc, [apiShipName, locSystemName, locCityName, locStoreName, apiShipPrice, type]);
								locID = locID + 1
							}
						}
						// console.log(message);
					}

				}
			}
		}

	} else if (listShips.length > 1 && listShips.length < 10) {
		// message = 'Désolé, vous devez sélectionner un seul ship ' + listShips;
		message = computeMessage(locale.ship_only_one, [listShips]);
	} else if (listShips.length >= 10) {
		// message = 'Désolé, j\'ai trouvé trop de ships correspondant à ce nom (' + listShips.length + ')';
		message = computeMessage(locale.ship_too_much, [listShips.length]);
	} else {
		// message = 'Désolé, je n\'ai trouvé aucun ship correspondant à ce nom. Je ne saurais que vous conseiller d\'acheter un Carrack!';
		message = computeMessage(locale.ship_no_ship, []);
	}
	return message
}

function compareComByPriceDesc(a, b) {

	if (a.price < b.price) {
		return -1;
	}
	if (a.price > b.price) {
		return 1;
	}
	return 0;
}
function compareComByPriceAsc(a, b) {

	if (a.price < b.price) {
		return 1;
	}
	if (a.price > b.price) {
		return -1;
	}
	return 0;
}

function getListCommodities(commName) {
	let listCommodities = [];
	for (var commodID in jsonCommoditiesData.data) {
		if (jsonCommoditiesData.data[commodID]['name'].toLowerCase() == commName.toLowerCase()) {
			listCommodities.push(jsonCommoditiesData.data[commodID]['name']);
			return listCommodities;
		} else if (jsonCommoditiesData.data[commodID]['name'].toLowerCase().includes(commName.toLowerCase())) {
			listCommodities.push(jsonCommoditiesData.data[commodID]['name']);
		}
	}
	return listCommodities;
}

function getCommoditiesPrice(commName, type) {
	const listCommodities = getListCommodities(commName)
	var message = ''
	if (listCommodities.length == 1) {
		var ListOfCommodities = [];
		for (var tradeport in jsonTradeportsData.data) {
			for (var commodity in jsonTradeportsData.data[tradeport]['prices']) {
				if (jsonTradeportsData.data[tradeport]['prices'][commodity]['name'] != null && jsonTradeportsData.data[tradeport]['prices'][commodity]['name'].toLowerCase() == listCommodities[0].toLowerCase() && jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] > 0) {
					var loc = jsonTradeportsData.data[tradeport]['planet']
					if (jsonTradeportsData.data[tradeport]['satellite'] != null && jsonTradeportsData.data[tradeport]['satellite'] != '') {
						loc = jsonTradeportsData.data[tradeport]['satellite']
					}
					if (jsonTradeportsData.data[tradeport]['city'] != null && jsonTradeportsData.data[tradeport]['city'] != '') {
						loc = jsonTradeportsData.data[tradeport]['city']
					}

					ListOfCommodities.push({ 'name': jsonTradeportsData.data[tradeport]['prices'][commodity]['name'], 'tradeport': jsonTradeportsData.data[tradeport]['name'], 'code': jsonTradeportsData.data[tradeport]['name_short'], 'localisation': loc, 'price': jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] })

				}
			}
		}
		if (type == 'buy')
			ListOfCommodities.sort(compareComByPriceDesc);
		else if (type == 'sell')
			ListOfCommodities.sort(compareComByPriceAsc);
		var limit = 0;
		for (var commodity in ListOfCommodities) {
			// ListOfCommodities[commodity]

			if (message == '') {
				message = computeMessage(locale.commodities_found, [ListOfCommodities[commodity]['name']])
			}

			if (type == 'buy')
				message = message + ' ' + computeMessage(locale.commodities_buy, [ListOfCommodities[commodity]['code'], ListOfCommodities[commodity]['localisation'], ListOfCommodities[commodity]['price'].toLocaleString('en-US')])
			else
				message = message + ' ' + computeMessage(locale.commodities_sell, [ListOfCommodities[commodity]['code'], ListOfCommodities[commodity]['localisation'], ListOfCommodities[commodity]['price'].toLocaleString('en-US')])
			limit = limit + 1;
			if (limit > 3) {
				break;
			}
		}
	} else if (listCommodities.length < 10 && listCommodities.length > 0) {
		message = computeMessage(locale.commodities_list, [listCommodities]);
	} else if (listCommodities.length >= 10) {
		message = computeMessage(locale.commodities_too_much, [listCommodities]);
	} else if (listCommodities.length == 0) {
		message = computeMessage(locale.commodities_none, [listCommodities]);
	}
	if (message == '') {
		message = computeMessage(locale.commodities_no_loc, [listCommodities, type]);
	}
	return message;
}


// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	if (msg.substr(0, 1) == '!') // Do we have a command ?
	{
		console.log(target + ': @' + context.username + ': ' + msg);
		const posDelim = msg.indexOf(' ');
		if (posDelim != -1) {
			const commandName = msg.substr(0, posDelim).trim();
			const commandArgs = msg.substr(posDelim, msg.length - posDelim).trim();

			// If the command is known, let's execute it
			if (commandName.toLowerCase() == '!' + locale.shiprent_command) {
				const res = getShipPrice(commandArgs, 'rent')
				if (res != undefined) {
					sendMe(target, res, context);
				}
			} else if (commandName.toLowerCase() == '!' + locale.shipbuy_command) {
				const res = getShipPrice(commandArgs, 'buy')
				if (res != undefined) {
					sendMe(target, res, context);
				}
			} else if (commandName.toLowerCase() == '!' + locale.infobuy_command) {
				const res = getCommoditiesPrice(commandArgs, 'buy',locale.infobuy_limit)
				if (res != undefined) {
					sendMe(target, res, context);
				}
			} else if (commandName.toLowerCase() == '!' + locale.infosell_command) {
				const res = getCommoditiesPrice(commandArgs, 'sell',locale.infosell_limit)
				if (res != undefined) {
					sendMe(target, res, context);
				}
			} else if (commandName.toLowerCase() == '!' + locale.trade_command) {
				var res = getCommoditiesPrice(commandArgs, 'buy',locale.trade_limit)
				if (res != undefined) {
					sendMe(target, res, context);
				}
				res = getCommoditiesPrice(commandArgs, 'sell',locale.trade_limit)
				if (res != undefined) {
					sendMe(target, res, context);
				}
			}

		} else {
			const commandName = msg.trim();
			if (commandName == '!' + locale.shiprent_command) {
				sendMe(target, computeMessage(locale.shiprent_usage, [locale.shiprent_command]));
			} else if (commandName == '!' + locale.shipbuy_command) {
				sendMe(target, computeMessage(locale.shipbuy_usage, [locale.shipbuy_command]));
			} else if (commandName == '!' + locale.help_command) {
				sendMe(target, computeMessage(locale.help_message, [locale.help_command]));
			} else if (commandName == '!' + locale.infosell_command) {
				sendMe(target, computeMessage(locale.infosell_usage, [locale.infosell_command]));
			} else if (commandName == '!' + locale.infobuy_command) {
				sendMe(target, computeMessage(locale.infobuy_usage, [locale.infobuy_command]));
			} else if (commandName == '!' + locale.coucou_command) {
				sendMe(target, computeMessage(locale.coucou_message, [locale.coucou_command]));
			} else if (commandName == '!' + locale.trade_command) {
				sendMe(target, computeMessage(locale.trade_usage, [locale.trade_command]));
			}
		}


	}
}

function sendMe(target, message, context) {
	const posLimit = 400;
	var msgArray = [];
	if (message.length < posLimit) {
		msgArray.push(message)
	} else {
		while (message.length >= posLimit) {
			var pos = message.indexOf('aUEC ', posLimit) + 5;
			msgArray.push(message.substr(0, pos));
			message = message.substr(pos, message.length);

		}
	}
	for (var msg in msgArray) {
		client.say(target, msgArray[msg])
	}
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
	console.log(`* Connected to ${addr}:${port}`);
}