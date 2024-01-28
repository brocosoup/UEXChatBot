import tmi from 'tmi.js';
import fetch from 'node-fetch';
import fs from 'node:fs';
import server from './server.cjs';
import { exit } from 'node:process';
import {log, setLogLevel} from './logger.cjs';
import { addToDatabase,refreshAPI,getShipPrice,getCommoditiesPrice,setLocale,computeMessage,saveData } from './manageData.cjs';
//import console from './console.js';

setLogLevel(0); //-1 for debug, 0 for info, 1 for warning, 2 for errors only

function initJSONFile(file) {
	if (!fs.existsSync(file + '.json')) {
		fs.writeFileSync(file + '.json', fs.readFileSync(file + '-template.json'))
	}
}

var twitch_refresh_token;

initJSONFile('locale');
let rawlocale = fs.readFileSync('locale.json');
const locale = await JSON.parse(rawlocale);
setLocale(locale);

initJSONFile('settings');
var config = JSON.parse(fs.readFileSync("settings.json"));
if (config.identity.password == undefined || config.identity.password == '' || (process.argv[2] && process.argv[2] === '-f')) {
	let profile = []
	server.runAuthServ();
	log('Waiting for authentication. Connect to the webserver now',0);
	while (profile == '') {
		profile = server.getProfile()
		await new Promise(r => setTimeout(r, 2000));
	}
	config.identity.username = profile.data[0].display_name.toLowerCase();
	config.identity.password = 'oauth:' + profile.accessToken;
	config.refreshToken = profile.refreshToken;
	if (config.channels[0] === '')
		config.channels = [profile.data[0].display_name.toLowerCase()];
	fs.writeFileSync("settings.json", JSON.stringify(config))
	server.close();
}


if (config.api_key == '') {
	if (!fs.existsSync('jsonCommoditiesData.json') || !fs.existsSync('jsonShipData.json') || !fs.existsSync('jsonTradeportsData.json')) {
		log('You have no api_key and no local files. I will now shutdown.',2);
		exit(2);
	} else {
		log('You UEX api_key is empty in settings.json, I will not update the data!',1);
	}
}

const api_settings = {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'api_key': config.api_key
	},
};

refreshAPI(api_settings);


// Connect to Twitch:
// Create a client with our options
var twitch_options = {
	identity: {
		'username': config.identity.username,
		'password': config.identity.password
	},
	channels: config.channels,
};

export function getsetChannels(channels = twitch_options.channels)
{
	config.channels = channels;
	twitch_options.channels = channels;
	log('chan set to: ' + channels);
	return twitch_options.channels;
}

var client = new tmi.client(twitch_options)

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
checkAuth();
client.connect()
	.catch(err => alert(err))

function alert(err)
{
	config.identity.username = '';
	config.identity.password = '';
	fs.writeFileSync("settings.json", JSON.stringify(config))
	log(err,2);
	exit(7);
}

setInterval(checkAuth, 1000 * 60 * 10);
log('Checking for oauth validity every 10 minutes',0);
setInterval(saveData,1000*60*1);

var listTimeout = [];
function clearRefreshs()
{
	for (var timeout in listTimeout)
	{
		clearTimeout(listTimeout[timeout]);
	}
}
function checkAuth()
{
	const api_set = {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'OAuth ' + config.identity.password.substr('oauth:'.length)
		},
	};
	log('Checking for our oauth2 token validity',-1)
	let api = [
		'https://id.twitch.tv/oauth2/validate'
	];
	let requests = api.map(async function (url) {
		const response = await fetch(url, api_set);
		return await response.json();
	});

	Promise.all(requests)
		.then((results) => {
			if (results[0].status === 401)
			{
				client.disconnect();
				clearRefreshs();
				refreshAuth();
				//alert('Login authentication failed');
			} else {
				twitch_refresh_token = Math.round(results[0].expires_in) - 30;
				log('I will refresh the token in ' + Math.round(twitch_refresh_token/60) + ' minutes',-1);
				clearRefreshs();
				listTimeout.push(setTimeout(refreshAuth, twitch_refresh_token * 1000));
			}
		}).catch(function (err) {
			log(err,2);
			exit(5);
		})

}

function refreshAuth()
{
	let ServerConfig = JSON.parse(fs.readFileSync('server.json'));
	const details = {
		'grant_type': 'refresh_token',
		'client_id': ServerConfig.server.client,
		'client_secret': ServerConfig.server.secret,
		'access_token': config.identity.password.substr('oauth:'.length),
		'refresh_token': config.refreshToken
	};

	var formBody = [];
	for (var property in details) {
	  var encodedKey = encodeURIComponent(property);
	  var encodedValue = encodeURIComponent(details[property]);
	  formBody.push(encodedKey + "=" + encodedValue);
	}
	formBody = formBody.join("&");

	const api_set = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body: formBody
	};

	log('Refreshing our oauth2 token',-1)
	let api = [
		'https://id.twitch.tv/oauth2/token'
	];
	let requests = api.map(async function (url) {
		const response = await fetch(url, api_set);
		return await response.json();
	});

	Promise.all(requests)
		.then((results) => {
			if (results[0].status === 401)
			{
				alert('Refresh token failed');
			} else {
				config.identity.password = 'oauth:' + results[0].access_token;
				log('oauth:' + results[0].access_token,-1)
				config.refreshToken = results[0].refresh_token;
				log('oauth:' + results[0].refresh_token,-1)
				twitch_options = {
					identity: {
						'username': config.identity.username,
						'password': config.identity.password
					},
					channels: config.channels,
				};
				reconnect_twitch();

			}
		}).catch(function (err) {
			log(err,2);
			exit(5);
		})

}

export function reconnect_twitch()
{
	fs.writeFileSync("settings.json", JSON.stringify(config))
	client.disconnect();
	log('Twitch Client closed',1);
	client = new tmi.client(twitch_options);
	client.on('message', onMessageHandler);
	client.on('connected', onConnectedHandler);
	client.connect()
		.catch(err => alert(err))
}
// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
	if (self) { return; } // Ignore messages from the bot
	let msgArray = messageHandle(target, context, msg,getLocale())
	for (var msg in msgArray) {
		client.say(target, msgArray[msg])
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
	return msgArray;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
	log(`Connected to ${addr}:${port}`,0);
}

export function getLocale()
{
	return locale;
}

export function getClient()
{
	return client;
}
export function messageHandle(target, context, msg,myLocale)
{
	if (msg.substr(0, 1) == '!') // Do we have a command ?
	{
		log(target + ': @' + context.username + ': ' + msg,-1);
		const posDelim = msg.indexOf(' ');
		var res = '';
		if (posDelim != -1) {
			const commandName = msg.substr(0, posDelim).trim();
			const cmd_args = msg.substr(posDelim, msg.length - posDelim).trim();
			var commandArgs=cmd_args.split(',');

			// If the command is known, let's execute it
			if (commandName.toLowerCase() == '!' + myLocale.shiprent_command) {
				res = getShipPrice(commandArgs[0], 'rent', myLocale.shiprent_limit)
			} else if (commandName.toLowerCase() == '!' + myLocale.shipbuy_command) {
				res = getShipPrice(commandArgs[0], 'buy', myLocale.shipbuy_limit)
			} else if (commandName.toLowerCase() == '!' + myLocale.infobuy_command) {
				res = getCommoditiesPrice(commandArgs[0], 'buy', myLocale.infobuy_limit)
			} else if (commandName.toLowerCase() == '!' + myLocale.infosell_command) {
				res = getCommoditiesPrice(commandArgs[0], 'sell', myLocale.infosell_limit)
			} else if (commandName.toLowerCase() == '!' + myLocale.trade_command) {
				res = getCommoditiesPrice(commandArgs[0], 'buy', myLocale.trade_limit)
				res = res + ' <=> ' + getCommoditiesPrice(commandArgs[0], 'sell', myLocale.trade_limit)
			} else if (commandName.toLowerCase() == '!' + myLocale.tadd_command )
			{
				res = addToDatabase(commandArgs,{target: target, context: context});
			}
		} else {
			const commandName = msg.trim();
			if (commandName == '!' + myLocale.shiprent_command) {
				res = computeMessage(myLocale.shiprent_usage, [myLocale.shiprent_command]);
			} else if (commandName == '!' + myLocale.shipbuy_command) {
				res = computeMessage(myLocale.shipbuy_usage, [myLocale.shipbuy_command]);
			} else if (commandName == '!' + myLocale.help_command) {
				res = computeMessage(myLocale.help_message, [myLocale.shiprent_command, myLocale.shipbuy_command, myLocale.infosell_command, myLocale.infobuy_command, myLocale.coucou_command, myLocale.trade_command, myLocale.tadd_command]);
			} else if (commandName == '!' + myLocale.infosell_command) {
				res = computeMessage(myLocale.infosell_usage, [myLocale.infosell_command]);
			} else if (commandName == '!' + myLocale.infobuy_command) {
				res = computeMessage(myLocale.infobuy_usage, [myLocale.infobuy_command]);
			} else if (commandName == '!' + myLocale.coucou_command) {
				res = computeMessage(myLocale.coucou_message, [myLocale.help_command]);
			} else if (commandName == '!' + myLocale.trade_command) {
				res = computeMessage(myLocale.trade_usage, [myLocale.trade_command]);
			} else if (commandName == '!' + myLocale.update_command) {
				res = computeMessage(myLocale.update_usage, [myLocale.update_command]);
			}
		}
		if (res != undefined) {
			return(sendMe(target, res, context));
		}
	}
}
