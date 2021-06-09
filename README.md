# Setup

1. Go to [this link](https://discordjs.guide/preparations/setting-up-a-bot-application.html) and follow the steps until you have your application created and can copy the token.
2. Rename `config.json.dist` to `config.json`
3. Insert the token into `config.json` at `bot->token`
4. [Enable developer options in Discord](https://discordia.me/en/developer-mode)
5. Create a channel that you want to use as help-channel, I recommend only giving write access to your staff members
6. Right click the channel, copy it's ID and insert it into `config.json` at `servers->channelId`
7. Fill your database credentials into `config.json` at `servers->db`, check the `config.lua` file of your OT server if you don't know them

## Creating the database tables
### Execute these commands in your MySQL or MariaDB shell / PHPMyAdmin
```sql
CREATE TABLE `help_discord` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(50) NULL DEFAULT NULL,
	`role` VARCHAR(50) NULL DEFAULT NULL,
	`message` VARCHAR(600) NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING HASH
)
ENGINE=MEMORY;

CREATE TABLE `help_ingame` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(50) NULL DEFAULT NULL,
	`level` SMALLINT(5) UNSIGNED NULL DEFAULT NULL,
	`group_id` TINYINT(3) UNSIGNED NULL DEFAULT NULL,
	`message` VARCHAR(500) NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING HASH
)
ENGINE=MEMORY;
```

## Adding the lua code to the OT server
### TFS 1.x
#### chatchannels/scripts/help.lua
```lua
local CHANNEL_HELP = 7

local muted = Condition(CONDITION_CHANNELMUTEDTICKS, CONDITIONID_DEFAULT)
muted:setParameter(CONDITION_PARAM_SUBID, CHANNEL_HELP)
muted:setParameter(CONDITION_PARAM_TICKS, 3600000)

function onSpeak(player, type, message)
	local playerAccountType = player:getAccountType()
	local playerLevel = player:getLevel()
	if playerLevel == 1 and playerAccountType == ACCOUNT_TYPE_NORMAL then
		player:sendCancelMessage("You may not speak into channels as long as you are on level 1.")
		return false
	end

	if player:getCondition(CONDITION_CHANNELMUTEDTICKS, CONDITIONID_DEFAULT, CHANNEL_HELP) then
		player:sendCancelMessage("You are muted from the Help channel for using it inappropriately.")
		return false
	end

	local playerName = player:getName()
	if playerAccountType >= ACCOUNT_TYPE_TUTOR then
		if string.sub(message, 1, 6) == "!mute " then
			local targetName = string.sub(message, 7)
			local target = Player(targetName)
			if target then
				if playerAccountType > target:getAccountType() then
					if not target:getCondition(CONDITION_CHANNELMUTEDTICKS, CONDITIONID_DEFAULT, CHANNEL_HELP) then
						target:addCondition(muted)
						sendChannelMessage(CHANNEL_HELP, TALKTYPE_CHANNEL_R1, target:getName() .. " has been muted by " .. playerName .. " for using Help Channel inappropriately.")
					else
						player:sendCancelMessage("That player is already muted.")
					end
				else
					player:sendCancelMessage("You are not authorized to mute that player.")
				end
			else
				player:sendCancelMessage(RETURNVALUE_PLAYERWITHTHISNAMEISNOTONLINE)
			end
			return false
		elseif string.sub(message, 1, 8) == "!unmute " then
			local targetName = string.sub(message, 9)
			local target = Player(targetName)
			if target then
				if playerAccountType > target:getAccountType() then
					if target:getCondition(CONDITION_CHANNELMUTEDTICKS, CONDITIONID_DEFAULT, CHANNEL_HELP) then
						target:removeCondition(CONDITION_CHANNELMUTEDTICKS, CONDITIONID_DEFAULT, CHANNEL_HELP)
						sendChannelMessage(CHANNEL_HELP, TALKTYPE_CHANNEL_R1, target:getName() .. " has been unmuted by " .. playerName .. ".")
					else
						player:sendCancelMessage("That player is not muted.")
					end
				else
					player:sendCancelMessage("You are not authorized to unmute that player.")
				end
			else
				player:sendCancelMessage(RETURNVALUE_PLAYERWITHTHISNAMEISNOTONLINE)
			end
			return false
		end
	end

	if type == TALKTYPE_CHANNEL_Y then
		if playerAccountType >= ACCOUNT_TYPE_TUTOR or player:hasFlag(PlayerFlag_TalkOrangeHelpChannel) then
			type = TALKTYPE_CHANNEL_O
		end
	elseif type == TALKTYPE_CHANNEL_O then
		if playerAccountType < ACCOUNT_TYPE_TUTOR and not player:hasFlag(PlayerFlag_TalkOrangeHelpChannel) then
			type = TALKTYPE_CHANNEL_Y
		end
	elseif type == TALKTYPE_CHANNEL_R1 then
		if playerAccountType < ACCOUNT_TYPE_GAMEMASTER and not player:hasFlag(PlayerFlag_CanTalkRedChannel) then
			if playerAccountType >= ACCOUNT_TYPE_TUTOR or player:hasFlag(PlayerFlag_TalkOrangeHelpChannel) then
				type = TALKTYPE_CHANNEL_O
			else
				type = TALKTYPE_CHANNEL_Y
			end
		end
	end

	local escapedName = db.escapeString(playerName)
	local groupId = player:getGroup():getId()
	local message = db.escapeString(words)
	db.asyncQuery(("INSERT INTO `help_ingame` (`name`, `level`, `group_id`, `message`) VALUES (%s, %d, %d, %s);"):format(escapedName, playerLevel, groupId, message))
	return type
end
```

## Starting the bot up
1. Install NodeJS, on Ubuntu or Debian you can do so via `sudo apt install nodejs`
2. Install PM2, like so `npm install pm2 -g`
3. Start the bot like so `pm2 start bot.js --name "help-bot"`
