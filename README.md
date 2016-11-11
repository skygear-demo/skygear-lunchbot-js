# Lunchbot - Skygear JS Cloud Code Demo

This project allows your team to create a list of lunch places in which
the bot will suggest lunch place to eat on a schedule.

## Demonstrated Features

This is a Skygear JS Cloud Code demo of the following cloud code features:

* Scheduled Tasks (suggest where to go for lunch at an interval)
* Calling Skygear API (saving and querying lunch places)
* Making SQL query with a PostgreSQL connection (for those data not exposed
  via a Skygear API)
* Handler (implement Slack webhook request)

## Requirements

* Skygear (sign up an account at [Skygear Cloud](https://portal.skygear.io/))
* Slack Incoming Webhook
* Slack Slash Command

## Usage

1. Clone this repository
2. Create an account in Skygear Cloud
3. Push the repository to Skygear Cloud (see [doc](https://docs.skygear.io/) for details)
4. Create Slack Incoming Webhook and Slack Slash Command
5. Configure the bot using environment variables

## Configuration

The bot can be configured with the following environment variables:

* `SLACK_SLASH_COMMAND_TOKEN` - The token is provided by slack to verify
  that the slash command really comes from slack.
* `SLACK_INCOMING_WEBHOOK` - The incoming webhook is how the bot
  can send a message to a slack channel. Also provided by slack.
* `DEBUG_MODE` - Print additional log when value is `true`.
* `CHANNEL_OVERRIDE` - Always send message to this channel.
* `DEFAULT_USER` - The username that the bot will use to access Skygear. 
  Default value is `admin`.
* `LUNCH_SCHEDULE` - Bot will send message in this lunch schedule. Please
  see the doc for scheduled task format.
