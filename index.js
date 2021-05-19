require('dotenv').config()
const express = require('express')

const app = express()
const bot = require('./bot')

if (process.env.NODE_ENV == 'production') {
    app.set('trust proxy', true)
    bot.webhookReply = false
    bot.telegram.setWebhook(process.env.WEBHOOK_URL + '/' + process.env.TELEGRAM_TOKEN)
    app.use(bot.webhookCallback('/' + process.env.TELEGRAM_TOKEN))
} else {
    (async function () {
        bot.launch()
    })()
}

app.listen(process.env.APP_PORT, process.env.APP_IP)
bot.stop()
