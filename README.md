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
* Récupérer une clé API sur https://uexcorp.space/api.html
* Connecter le bot à Twitch sur https://twitchapps.com/tmi/
* On met tout dans le settings.json (qu'il faut créér)
```json
{
	"username": "",
	"password": "",
	"api_key": "",
	"channels": [ "","" ]
}
```
- Launch it!
```
npm start
```
  Navigate to `http://localhost:3000`
