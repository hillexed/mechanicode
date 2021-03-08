# Mechanicode

A discord bot that runs p5.js code, server-side renders a webm, and sends it back. It can also run javascript code and prints it back out. 

Naturally, running untrusted code is a pretty bad idea. This uses [https://github.com/patriksimek/vm2](vm2) for sandboxing, but I don't trust this to be safe at all right now. 

Contributions welcome!


### Deploying the Bot

After obtaining a Discord bot token, add a `.env` file containing the line
```
DISCORD_TOKEN=<insert bot token here>
```
to this directory. The bot is then started by running `node index.js`.





