"use strict";
const Discord = require("discord.js");
const {executeCode, RESULT_TYPES, ERROR_TYPES} = require("./executeCode.js");
const {runP5Code } = require("./runp5Code.js");
require("dotenv").config();

const client = new Discord.Client();

const prefix = "!";

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


    
//don't flood the channel, keep output nice and slow
const MAX_CHARS = 30;
const MAX_LINES = 15;

client.on("message", function(message) {
  if (message.author.bot) return;
  if (!message.content.trim().startsWith(prefix)) return;

  const commandBody = message.content.trim().slice(prefix.length);
  const lines = commandBody.split('\n');
  if(lines.length == 0){
    return;
  }

  const command = lines[0].split(' ')[0].toLowerCase().trim();

  if (command === "ping") {
    const timeTaken = Date.now() - message.createdTimestamp;
    message.reply(`hi im here`);
  }

  else if (command === "draw"){
    const restOfCommand = commandBody.slice("draw".length).trim()
    if(restOfCommand.length === 0){ //message is only '!run'
        message.reply(`uh ok but i need some code`);
        return
    }
    const codeLines = restOfCommand;

    runP5Code(codeLines).then(async (webmbuffer)=>{
        let attachment = new Discord.MessageAttachment(webmbuffer, "yourcoolart.webm");
        //await fs.writeFile("temp.webm",webmbuffer);
        message.reply("ok heres your video", attachment);
    }).catch((err)=>{
        console.error(err)
        message.reply(`oh no. uhh heres the error message i got: ` + err.error);
    });
  }

  else if (command === "run") {
    const restOfCommand = commandBody.slice("run".length).trim()
    if(restOfCommand.length === 0){ //message is only '!run'
        message.reply(`uh ok but i need some code`);
        return
    }
    const codeLines = restOfCommand;

    //actually run the code
    let executionResult = executeCode(codeLines);

    if (executionResult.resultType !== RESULT_TYPES.SUCCESS){
        let failMessage = `oh no. im sorry. something really broke:\n${executionResult.error}`;
        if(executionResult.errorType == ERROR_TYPES.TIMEOUT){
            failMessage = `oh no i tried running your code but it took too long and i had to stop it. im sorry`
        } else if(executionResult.errorType == ERROR_TYPES.COMPILING){
            failMessage = `oh no. im sorry. i couldn't understand that code. heres what it said:\n${executionResult.error}`
        } else if(executionResult.errorType == ERROR_TYPES.EXECUTION){
            failMessage = `oh no. im sorry. i had some trouble running your code. heres what it said:\n${executionResult.error}`
        } else if(executionResult.errorType == ERROR_TYPES.ASYNC){
            failMessage = `oh no. im sorry. i had some trouble running your code. heres what it said:\n${executionResult.error}`
        }
        if(executionResult.output !== undefined && executionResult.output.length > 0){
            const lastBitOfOutput = limitOutputSize(executionResult.output, MAX_CHARS, MAX_LINES);
            failMessage += `\nat least before that, your code said this:\n${lastBitOfOutput}`
        }

        message.reply(failMessage);
        return;
    }

    //success!
    const returnedOutput = executionResult.output;

    if (returnedOutput.length > MAX_CHARS || returnedOutput.split("\n").length > MAX_LINES){
        const possiblyChoppedMessage = limitOutputSize(returnedOutput, MAX_CHARS, MAX_LINES);
        message.reply(`ok! your program said too many things so here's the last things it said:\n${possiblyChoppedMessage}`);
        return;
    }

    message.reply(`ok! here's what that did:\n${returnedOutput}`);
    return;
  }
});

function limitOutputSize(string, max_chars, max_lines){
        let oldLength = string.length;
        string = string.slice(-max_chars);
        string = string.split("\n").slice(-max_lines).join("\n");

        if (string.length != oldLength){
            string = "..."+string //show we've chopped it off
        }

        return string;
}

client.login(process.env.DISCORD_TOKEN);
