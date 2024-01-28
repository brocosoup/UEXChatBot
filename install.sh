#!/bin/bash

sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y npm git

git clone https://github.com/brocosoup/UEXChatBot.git UEXChatBot
cd UEXChatBot
npm install

