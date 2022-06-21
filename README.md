# GDQ Speedrun Reminder Bot

This is a simple self-hosted site which lets you choose GDQ runs you're interested in to receive a reminder notification via a Discord webhook before the run starts.

## Setup

1. Clone this repository
1. `npm install`
1. Create a copy of `.env.example` named `.env`
1. In a Discord channel of your choice, create a webhook (found under "Integrations" in the channel's settings) and copy the webhook url
1. Paste your webhook URL into the value of `DISCORD_WEBHOOK` in your `.env` file.
1. `npm run build`
1. `npm start`

Your server should be running at `http://localhost:5008`

