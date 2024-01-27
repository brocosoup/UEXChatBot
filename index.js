#!/usr/bin/env node

import inquirer from 'inquirer';
import { messageHandle, getLocale, getClient, getsetChannels, reconnect_twitch } from './core.js';
import { saveData, repeatLastCommands } from './manageData.cjs';
import { setLogLevel } from './logger.cjs';

export default async function run() {
  console.log('Hi! 👋  I\'m now ready to execute your commands!');
  var command = '';
  var isRuntime = true;
  while (isRuntime) {
    const { command } = await inquirer.prompt({
      type: 'input',
      name: 'command',
      message: 'UEXChatBot>'
    });
    if (command == 'exit') {
      isRuntime = false;
      getClient().disconnect();
      process.exit(0);
    } else if (command == 'logDebug') {
      setLogLevel(-1);
    } else if (command == 'logWarning') {
      setLogLevel(1);
    } else if (command == 'save') {
      saveData(true);
    } else if (command == 'showlast') {
      repeatLastCommands();
    } else if (command.split(' ')[0] == 'join') {
      const channel = command.split(' ')[1].split(',')[0];
      const actual_list = getsetChannels();
      if ((!actual_list.includes(channel)) && (!actual_list.includes('#'+channel))) {
        getsetChannels().push(channel);
        console.log(getsetChannels());
        reconnect_twitch();
      }
    } else if (command.split(' ')[0] == 'part') {
      const channel = command.split(' ')[1].split(',')[0];
      const actual_list = getsetChannels();
      console.log(actual_list);
      if (actual_list.includes(channel) || actual_list.includes('#'+channel)) {
        var index = getsetChannels().indexOf('#'+channel);
        console.log(index);
        if (index != -1)
          getsetChannels().splice(getsetChannels().indexOf('#'+channel), 1);

        index = getsetChannels().indexOf(channel);
        console.log(index);
        if (index != -1)
          getsetChannels().splice(getsetChannels().indexOf(channel), 1);
        console.log(getsetChannels());
        reconnect_twitch();
      }
    }  else {
      let msgArray = messageHandle('#console', { username: 'localconsole', 'display-name': 'LocalConsole' }, command, getLocale())
      for (var msg in msgArray) {
        console.log(msgArray[msg]);
      }
    }
  }
}

run();