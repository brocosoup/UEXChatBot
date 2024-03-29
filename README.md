# UEXChatBot

# Environment vars
This project uses the following environment variables:

| Name                          | Description                         | Default Value                                  |
| ----------------------------- | ------------------------------------| -----------------------------------------------|
|CONNECTED_MODE           | Local or API (not used yet)           | "API"      |


# Pre-requisites
- Install [Node.js](https://nodejs.org/en/) version >= 20.11.0 (also tested with 21.6.0)
- Git client need to be installed (to get the repository and the updates)


# Getting started
- Clone the repository
```
git clone  https://github.com/brocosoup/UEXChatBot.git UEXChatBot
```
- Install dependencies
```
cd UEXChatBot
npm install
npm install tmi
npm install node-fetch
npm install esm
```
- Launch it!
```
npm start
```
  Navigate to `http://localhost:3000`
  Login to twitch
  
- Check settings.json and server.json
	* Get an API key from https://uexcorp.space/api.html (optional if you have json files)
 	* username is the bot twitch username (e.g. mybot)
	* password if your oauth key from twitchapps (e.g. oauth:ks478f8fveruijnze545645)
 	* api_key is the UEX api key (e.g. ezf4897bg156trg4899bv156r189189)
  	* channels is a table containing one channel (e.g. "channels": [ "mychannel" ] ) or a list of channels (e.g. "channels": ["mychannel","myotherchannel"] )
```json
{
	"server": {
		"client": "changeme",
		"secret": "changeme",
		"session": "changeme",
		"callback": "http://localhost:3000/auth/twitch/callback",
		"port": 3000,
		"privateKey": "",
		"certificate": ""
	}
}
```
```json
{
    "identity": {
        "username": "",
        "password": ""
    },
    "channels": [
        ""
    ],
    "api_key": ""
}
```
# How to use it:

