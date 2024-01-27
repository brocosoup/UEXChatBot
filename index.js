#!/usr/bin/env node

import inquirer from 'inquirer';
import { messageHandle, getLocale,getClient } from './core.js';
import { saveData,repeatLastCommands } from './manageData.cjs';
import {setLogLevel} from './logger.cjs';

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
    if (command == 'exit')
    {
      isRuntime = false;
      getClient().disconnect();
      process.exit(0);
    } else if (command == 'logDebug')
    {
      setLogLevel(-1);
    } else if (command == 'logWarning')
    {
      setLogLevel(1);
    } else if (command == 'save')
    {
      saveData(true);
    } else if (command == 'showlast')
    {
      repeatLastCommands();
    } else {
      let msgArray = messageHandle('#console', {username: 'localconsole'}, command,getLocale())
      for (var msg in msgArray) {
        console.log(msgArray[msg]);
      }
    }
  }
}

run();