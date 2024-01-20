# UEXChatBot

# Environment vars
This project uses the following environment variables:

| Name                          | Description                         | Default Value                                  |
| ----------------------------- | ------------------------------------| -----------------------------------------------|
|CONNECTED_MODE           | Local or API (not used yet)           | "API"      |


# Pre-requisites
- Install [Node.js](https://nodejs.org/en/) version >= 20.11.0 (also tested with 21.6.0)


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
- Edit settings.json
	* Get an API key from https://uexcorp.space/api.html
	* Connect the bot account to https://twitchapps.com/tmi/
 	* username is the bot twitch username (e.g. mybot)
	* password if your oauth key from twitchapps (e.g. oauth:ks478f8fveruijnze545645)
 	* api_key is the UEX api key (e.g. ezf4897bg156trg4899bv156r189189)
  	* channels is a table containing one (e.g. "channels": [ "mychannel" ]) or a list (e.g. "channels": ["mychannel","myotherchannel"]) of channels
```json
{
	"username": "mybot",
	"password": "oauth:ks478f8fveruijnze545645",
	"api_key": "ezf4897bg156trg4899bv156r189189",
	"channels": [ "mychannel" ]
}
```

- Launch it!
```
npm start
```
  Navigate to `http://localhost:3000`
