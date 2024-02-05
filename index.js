#!/usr/bin/env node

import inquirer from 'inquirer';
import * as cs from './core.js';
import * as md from './manageData.cjs';
import * as logger from './logger.cjs';
import * as jr from './jobrunner.js';

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
      cs.getClient().disconnect();
      process.exit(0);
    } else if (myCommand.split(' ')[0] == 'log') {
      if(myCommand.split(' ')[1] != '')
        logger.setLogLevel(myCommand.split(' ')[1]);
    } else if (myCommand == 'save') {
      md.saveData(true);
      jr.saveALL(true);
    } else if (myCommand == 'showlast') {
      md.repeatLastCommands(cs.getLocale());
    } else if (myCommand.split(' ')[0] == 'say') {
      const channel = myCommand.split(' ')[1].split(',')[0].replace(/^ */g, '').replace(/ *$/g, '');
      cs.sendOnChan('#' + channel,myCommand.split(',')[1])
    } else if (myCommand.split(' ')[0] == 'join') {
      const channel = myCommand.split(' ')[1].split(',')[0];
      const actual_list = cs.getsetChannels();
      if ((!actual_list.includes(channel)) && (!actual_list.includes('#' + channel))) {
        cs.getsetChannels().push(channel);
        cs.reconnect_twitch();
      }
    } else if (myCommand.split(' ')[0] == 'part') {
      const channel = myCommand.split(' ')[1].split(',')[0];
      const actual_list = cs.getsetChannels();
      if (actual_list.includes(channel) || actual_list.includes('#' + channel)) {
        var index = cs.getsetChannels().indexOf('#' + channel);
        if (index != -1)
          cs.getsetChannels().splice(cs.getsetChannels().indexOf('#' + channel), 1);

        index = cs.getsetChannels().indexOf(channel);
        if (index != -1)
          cs.getsetChannels().splice(cs.getsetChannels().indexOf(channel), 1);
        cs.reconnect_twitch();
      }
    } else if (myCommand == 'listchan') {
      console.log(cs.getsetChannels());
    } else if (myCommand.split(' ')[0] == 'banjob') {
      const id = myCommand.split(' ')[1].split(',')[0].replace(/^ */g, '').replace(/ *$/g, '');
      console.log('Banned job ' + id)
      jr.validateJob(id,false);
    } else if (myCommand.split(' ')[0] == 'unbanjob') {
      const id = myCommand.split(' ')[1].split(',')[0].replace(/^ */g, '').replace(/ *$/g, '');
      console.log('Unbanned job ' + id)
      jr.validateJob(id,false);
    } else {
      let msgArray = cs.messageHandle('#console', { username: 'localconsole', 'display-name': 'LocalConsole' }, myCommand, cs.getLocale())
      for (var msg in msgArray) {
        console.log(msgArray[msg]);
      }
    }
  }
}

run();