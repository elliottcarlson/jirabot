# JiraBot

This is a Slack bot to interact with JIRA, using [ghee](https://github.com/elliottcarlson/ghee).

### Setup

Clone this repo.

Go to your [Custom Integrations](https://www.slack.com/apps/manage/custom-integrations)
page for your Slack instance and set up a new Bot integration. Copy the API
token and save for later.

Create a local user on your JIRA instance - even if you are using an SSO
solution. Save the username and password for this user.

If running locally, copy `.env-sample` to `.env` and add your Slack API token
as well as JIRA credentials to the `.env` file.

You can also set the environment variables listed in the `.env` file on your
host directly.

If running on a hosted service such as Heroku, you can set the Config Variables
on your apps Settings page.

### Run

Run `npm install` if you have just cloned the repo for the first time, to
install the required dependencies.

Run `npm start` to start JiraBot.

### Usage

The bot will now join your Slack instance if you specified the correct API
token. You can invite the bot to whatever channel you want it to be present in.

JiraBot will automatically look up any references to JIRA style tickets, unless
the id is located within a URL.

Additionally, JiraBot also understands the following commands:

- `.help` - The below listed commands.
- `.projects` - Get a list of all projects keys.
- `.project [KEY]` - Get information about a specific project key.
- `.create [KEY] [TITLE]` - Create a new ticket with the title in the selected project.
- `.create [KEY] [TITLE] => [DESCRIPTION]` - Create a new ticket with the title and description in the selected project.
- `.query [JQL]` - Perform a search using [JIRA Query Language](https://confluence.atlassian.com/jiracore/blog/2015/07/search-jira-like-a-boss-with-jql)

### Quick Deploy

You can quickly run JiraBot via Heroku. Clicking this button will take you to
Heroku, where you will be able to enter your Slack API token and JIRA credentals
and then launch the bot on a single worker dyno.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

