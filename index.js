#!/usr/bin/env node

import inquirer from 'inquirer';
import { messageHandle, getLocale, getClient, getsetChannels, reconnect_twitch, sendOnChan } from './core.js';
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
      repeatLastCommands(getLocale());
    } else if (command.split(' ')[0] == 'say') {
      const channel = command.split(' ')[1].split(',')[0];
      sendOnChan('#' + channel,command.split(',')[1])
    } else if (command.split(' ')[0] == 'join') {
      const channel = command.split(' ')[1].split(',')[0];
      const actual_list = getsetChannels();
      if ((!actual_list.includes(channel)) && (!actual_list.includes('#' + channel))) {
        getsetChannels().push(channel);
        reconnect_twitch();
      }
    } else if (command.split(' ')[0] == 'part') {
      const channel = command.split(' ')[1].split(',')[0];
      const actual_list = getsetChannels();
      if (actual_list.includes(channel) || actual_list.includes('#' + channel)) {
        var index = getsetChannels().indexOf('#' + channel);
        if (index != -1)
          getsetChannels().splice(getsetChannels().indexOf('#' + channel), 1);

        index = getsetChannels().indexOf(channel);
        if (index != -1)
          getsetChannels().splice(getsetChannels().indexOf(channel), 1);
        reconnect_twitch();
      }
    } else if (command == 'listchan') {
      console.log(getsetChannels());
    } else {
      let msgArray = messageHandle('#console', { username: 'localconsole', 'display-name': 'LocalConsole' }, command, getLocale())
      for (var msg in msgArray) {
        console.log(msgArray[msg]);
      }
    }
  }
}

run();