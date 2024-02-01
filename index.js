#!/usr/bin/env node

import inquirer from 'inquirer';
import { messageHandle, getLocale, getClient, getsetChannels, reconnect_twitch, sendOnChan } from './core.js';
import { saveData, repeatLastCommands } from './manageData.cjs';
import { setLogLevel } from './logger.cjs';

export default async function run() {
  console.log('Hi! 👋  I\'m now ready to execute your commands!');
  var isRuntime = true;
  while (isRuntime) {
    const { command } = await inquirer.prompt({
      type: 'input',
      name: 'command',
      message: 'UEXChatBot>'
    });
    var myCommand = command.trim().replace(/ {1,}/g, ' ')
    if (myCommand == 'exit') {
      isRuntime = false;
      getClient().disconnect();
      process.exit(0);
    } else if (myCommand.split(' ')[0] == 'log') {
      if(myCommand.split(' ')[1] != '')
        setLogLevel(myCommand.split(' ')[1]);
    } else if (myCommand == 'save') {
      saveData(true);
    } else if (myCommand == 'showlast') {
      repeatLastCommands(getLocale());
    } else if (myCommand.split(' ')[0] == 'say') {
      const channel = myCommand.split(' ')[1].split(',')[0].replace(/^ */g, '').replace(/ *$/g, '');
      sendOnChan('#' + channel,myCommand.split(',')[1])
    } else if (myCommand.split(' ')[0] == 'join') {
      const channel = myCommand.split(' ')[1].split(',')[0];
      const actual_list = getsetChannels();
      if ((!actual_list.includes(channel)) && (!actual_list.includes('#' + channel))) {
        getsetChannels().push(channel);
        reconnect_twitch();
      }
    } else if (myCommand.split(' ')[0] == 'part') {
      const channel = myCommand.split(' ')[1].split(',')[0];
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
    } else if (myCommand == 'listchan') {
      console.log(getsetChannels());
    } else {
      let msgArray = messageHandle('#console', { username: 'localconsole', 'display-name': 'LocalConsole' }, myCommand, getLocale())
      for (var msg in msgArray) {
        console.log(msgArray[msg]);
      }
    }
  }
}

run();