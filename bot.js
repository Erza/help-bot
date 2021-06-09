const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const db = require('./util/db.js');
const emoji = require('node-emoji');

client.on('ready', async () => {
    const serverCount = client.guilds.cache.size;
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}! Watching ${serverCount} ${((serverCount > 1) ? 'servers' : 'server')}.`);
        await client.user.setActivity('the help channels', { type: 'WATCHING' });
    }
});

client.on('message', async (message) => {
    if (message.author.bot) {
        return;
    }

    // check if the message is sent in a discord help-channel of a server we configured
    const server = config.servers.find(server => (message.channel.id === server.channelId));
    if (!server) {
        return;
    }

    if (message.content) {
        if (message.content.length <= 550) {
            try {
                const displayName = message.member.displayName;
                const roleName = message.member.roles.highest.name;

                const connection = await db.getConnection(server);
                await connection.query("INSERT INTO `help_discord` (`name`, `role`, `message`) VALUES (?, ?, ?)", [displayName, roleName, emoji.unemojify(message.content)]);
            } catch (err) {
                console.error(err);
                await message.channel.send("Something went wrong while relaying the message to the game server.");
            }
        } else {
            await message.reply("Message was too long and hasn't been sent ingame.");
        }
    } else {
        await message.reply("Message had no text content and hasn't been sent ingame.");
    }
});

client.setInterval(async () => {
    for (server of config.servers) {
        const channel = client.channels.resolve(server.channelId);
        if (channel) {
            const connection = await db.getConnection(server);
            const messages = await connection.query("SELECT * FROM `help_ingame` ORDER BY `id` ASC");
            
            messages.forEach(async (message) => {
                const playerName = (message.group_id > 1) ? `**${message.name}** :star:` : message.name;
                await channel.send(`${playerName} [${message.level}]: ${message.message}`);
            });

            if (messages.length > 0) {
                await connection.query("TRUNCATE TABLE `help_ingame`");
            }
        }
    }
}, 2000);

client.on('error', console.error);

process.on('unhandledRejection', console.error);

client.login(config.bot.token);
