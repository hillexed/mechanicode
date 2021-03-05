const Discord = require("discord.js");
const {executeCode, RESULT_TYPES, ERROR_TYPES} = require("./executeCode.js");
require("dotenv").config();

const client = new Discord.Client();

const prefix = "!";

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", function(message) {
  if (message.author.bot) return;
  if (!message.content.trim().startsWith(prefix)) return;

  const commandBody = message.content.trim().slice(prefix.length);
  const lines = commandBody.split('\n');
  console.log(lines)
  if(lines.length == 0){
    return;
  }

  const command = lines[0].split(' ')[0].toLowerCase().trim();
    console.log(command)

  if (command === "ping") {
    const timeTaken = Date.now() - message.createdTimestamp;
    message.reply(`hi im here`);
  }

  else if (command === "run") {
    restOfCommand = commandBody.slice("run".length).trim()
    if(restOfCommand.length === 0){ //message is only '!run'
        message.reply(`uh ok but i need some code`);
        return
    }
    const codeLines = restOfCommand;

    //actually run the code
    let executionResult = executeCode(codeLines);

    console.log(executionResult.resultType);
    console.log("Executed");

    if (executionResult.resultType !== RESULT_TYPES.SUCCESS){
        console.log("in here");
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
        console.log(failMessage);
        message.reply(failMessage);
        return;
    }

    //success!
    const returnedOutput = executionResult.output;
    
    //don't flood the channel, keep output nice and slow
    const MAX_CHARS = 300;
    const MAX_LINES = 10;

    if (returnedOutput.length > MAX_CHARS || returnedOutput.split("\n").length > MAX_LINES){
        returnedOutput = returnedOutput.split(-MAX_CHARS);
        returnedOutput = returnedOutput.split("\n").slice(0,MAX_LINES).join("\n");

        message.reply(`ok! your program said too many things so here's the last things it said:\n${returnedOutput}`);
        return;
    }

    message.reply(`ok! here's what that did:\n${returnedOutput}`);
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
