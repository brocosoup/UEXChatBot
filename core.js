import tmi from 'tmi.js';
import fetch from 'node-fetch';
import fs, { existsSync } from 'node:fs';
import server from './server.cjs';
import { exit } from 'node:process';
import {log, setLogLevel} from './logger.cjs';
import { addToDatabase,refreshAPI,getShipPrice,getCommoditiesPrice/*,setLocale*/,computeMessage,saveData, getListLoc,getListCom } from './manageData.cjs';
import * as jr from './jobrunner.js';

//import console from './console.js';

function initJSONFile(file) {
	if (!fs.existsSync(file + '.json')) {
		fs.writeFileSync(file + '.json', fs.readFileSync(file + '-template.json'))
	}
}

initJSONFile('locale');
let rawlocale = fs.readFileSync('locale.json');
const locale = await JSON.parse(rawlocale);
/*setLocale(locale);*/
var locales = {};

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
	log('chan set to: ' + channels,-1);
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
log('Checking for oauth validity every 10 minutes',-1);
setInterval(saveData,1000*60*1);
setInterval(jr.saveALL,1000*60*1);

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
	log('Checking for our oauth2 token validity now',-1)
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
				var twitch_refresh_token = Math.round(results[0].expires_in) - 30;
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
				log('access_token:' + results[0].access_token,0)
				config.refreshToken = results[0].refresh_token;
				log('refresh_token:' + results[0].refresh_token,0)
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
	log('Twitch Client closed',-1);
	client = new tmi.client(twitch_options);
	client.on('message', onMessageHandler);
	client.on('connected', onConnectedHandler);
	client.connect()
		.catch(err => alert(err))
}
// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
	if (self) { return; } // Ignore messages from the bot
	let msgArray = messageHandle(target, context, msg,getLocale(target))
	for (var msg in msgArray) {
		if(msgArray[msg] != '')
			client.say(target, '@' + context.username + ' ' + msgArray[msg])
	}
}

export function sendOnChan(target, msg) {
	if(msg != '')
	{
		client.say(target, msg)
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
	log(`Connected to ${addr}:${port}`,-1);
}

export function getLocale(target='')
{
	var myLocale = locale
	if (target != '' )
	{	
		const myTrgt = target.substring(1)
		if (locales[myTrgt] != undefined)
		{
			myLocale = locales[myTrgt];
		} else if (fs.existsSync(myTrgt + '_locale.json')) {
			const trawLocale = fs.readFileSync(myTrgt + '_locale.json')
			locales[myTrgt] = JSON.parse(trawLocale);
			myLocale = locales[myTrgt];
		}
	} 
	return myLocale;
}

export function getClient()
{
	return client;
}
export function messageHandle(target, context, msg,myLocale)
{
	log(target + ': @' + context.username + ': ' + msg,-2);
	if (msg.substr(0, 1) == '!') // Do we have a command ?
	{
		log(target + ': @' + context.username + ': ' + msg,0);
		const posDelim = msg.indexOf(' ');
		var res = '';
		if (posDelim != -1) {
			const commandName = msg.substr(0, posDelim).trim();
			const cmd_args = msg.substr(posDelim, msg.length - posDelim).trim();
			var commandArgs=cmd_args.split(',');

			// If the command is known, let's execute it
			if (commandName.toLowerCase() == '!' + myLocale.shiprent_command) {
				res = getShipPrice(commandArgs[0], 'rent', myLocale.shiprent_limit,myLocale)
			} else if (commandName.toLowerCase() == '!' + myLocale.shipbuy_command) {
				res = getShipPrice(commandArgs[0], 'buy', myLocale.shipbuy_limit,myLocale)
			} else if (commandName.toLowerCase() == '!' + myLocale.infobuy_command) {
				res = getCommoditiesPrice(commandArgs[0], 'buy', myLocale.infobuy_limit,myLocale)
			} else if (commandName.toLowerCase() == '!' + myLocale.infosell_command) {
				res = getCommoditiesPrice(commandArgs[0], 'sell', myLocale.infosell_limit,myLocale)
			} else if (commandName.toLowerCase() == '!' + myLocale.trade_command) {
				res = getCommoditiesPrice(commandArgs[0], 'buy', myLocale.trade_limit,myLocale)
				res = res + ' <=> ' + getCommoditiesPrice(commandArgs[0], 'sell', myLocale.trade_limit,myLocale)
			} else if (commandName.toLowerCase() == '!' + myLocale.tadd_command )
			{
				res = addToDatabase(commandArgs,{target: target, context: context},myLocale);
			} else if (commandName.toLowerCase() == '!' + myLocale.listloc_command )
			{
				res = getListLoc(commandArgs[0], myLocale.listcom_limit,myLocale);
			} else if (commandName.toLowerCase() == '!' + myLocale.listcom_command )
			{
				res = getListCom(commandArgs[0], myLocale.listcom_limit,myLocale);
			} else if (commandName.toLowerCase() == '!' + myLocale.propose_command )
			{
				if (commandArgs.length==2 && !isNaN(commandArgs[1]))
					res = jr.proposeJob(target,context,{title:commandArgs[0],gain:commandArgs[1]});
				else
					res = computeMessage(myLocale.propose_usage, [myLocale.propose_command]);
			} else if (commandName.toLowerCase() == '!' + myLocale.accept_command )
			{
				log(`Accepting job ${commandArgs[0]} by ${context['display-name']}`,-1)
				if (jr.acceptJob(commandArgs[0],context) == 0)
					res = computeMessage(myLocale.job_accepted,[commandArgs[0],context['display-name'],jr.getUserRating(context['display-name'],1)])
				else
					res = computeMessage(myLocale.accept_usage, [myLocale.accept_command]);
			} else if (commandName.toLowerCase() == '!' + myLocale.abandon_command )
			{
				if (jr.finishJob(commandArgs[0],context,false) == 0)
					res = computeMessage(myLocale.job_abandon,[commandArgs[0],context['display-name'],jr.getUserRating(context['display-name'],1)])
				else
					res = computeMessage(myLocale.abandon_usage, [myLocale.abandon_command]);
			} else if (commandName.toLowerCase() == '!' + myLocale.complete_command )
			{
				if (jr.finishJob(commandArgs[0],context,true) == 0)
					res = computeMessage(myLocale.job_finish,[commandArgs[0],context['display-name'],jr.getUserRating(context['display-name'],1)])
				else
					res = computeMessage(myLocale.complete_usage, [myLocale.complete_command]);
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
			} else if (commandName == '!' + myLocale.tadd_command) {
				res = computeMessage(myLocale.update_usage, [myLocale.tadd_command]);
			} else if (commandName == '!' + myLocale.listloc_command) {
				res = computeMessage(myLocale.listloc_usage, [myLocale.listloc_command]);
			} else if (commandName == '!' + myLocale.listcom_command) {
				res = computeMessage(myLocale.listcom_usage, [myLocale.listcom_command]);
			} else if (commandName == '!' + myLocale.propose_command) {
				res = computeMessage(myLocale.propose_usage, [myLocale.propose_command]);
			} else if (commandName == '!' + myLocale.accept_command) {
				res = computeMessage(myLocale.accept_usage, [myLocale.accept_command]);
			} else if (commandName == '!' + myLocale.abandon_command) {
				res = computeMessage(myLocale.abandon_usage, [myLocale.abandon_command]);
			} else if (commandName == '!' + myLocale.complete_command) {
				res = computeMessage(myLocale.complete_usage, [myLocale.complete_command]);
			} else if (commandName == '!' + myLocale.joblist_commands) {
				res = computeMessage(myLocale.jobs_avail);
				const jobs = jr.getJobs();
				for (var job in jobs)
				{
					if(jobs[job].validated && !jobs[job].finished && jobs[job].employee === null)
					{
						res = res + computeMessage(myLocale.list_job,[job,jobs[job].title,jobs[job].gain,jobs[job].jobgiver['display-name'],jr.getUserRating(jobs[job].jobgiver['display-name'])]) + "; "
					}
				}
			} else if (commandName == '!' + myLocale.jobs_commands) {
				res = computeMessage(myLocale.jobs_message,[myLocale.propose_command,myLocale.accept_command,myLocale.abandon_command,myLocale.complete_command]);
			}
		}
		if (res != undefined) {
			return(sendMe(target, res, context));
		}
	}
}
