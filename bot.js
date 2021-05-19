const { Telegraf } = require('telegraf')
const LocalSession = require('telegraf-session-local')
const Markup = require('telegraf/markup')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
let Screens = require('./screens')

const helpers = require('./helpers')

// registration
const registerScene = new Scene('register')
registerScene.enter(async (ctx) => {
    if (ctx.from.id == process.env.TELEGRAM_ADMIN) {
        ctx.session.superuser = true
    }
    ctx.session.username = ctx.from.username

    if (ctx.session.name) {
        await ctx.reply('Здравствуйте!\nКомпания Happytel приветствует Вас🤗. Спасибо за Ваш выбор😊', Markup.keyboard(['Связаться с оператором']).resize().extra())
        await ctx.scene.enter('menu')
    } else {
        await ctx.scene.enter('name')
    }
})

const nameScene = new Scene('name')
nameScene.enter((ctx) => {
    ctx.reply('Пожалуйста, укажите ваше имя', Markup.keyboard([ctx.chat.first_name
        + ' ' + (ctx.chat.last_name || '')]).resize().extra())
})
nameScene.on('text', (ctx) => {
    ctx.session.name = ctx.message.text
    ctx.scene.enter('phone')
})

const phoneScene = new Scene('phone')
phoneScene.enter((ctx) => {
    ctx.reply('Отлично! Теперь укажите ваш номер телефона',
        Markup.keyboard([Markup.contactRequestButton('Оставить контакт')]).resize().extra())
})
phoneScene.on('contact', async (ctx) => {
    ctx.session.phone = ctx.message.contact.phone_number
    await ctx.reply('Здравствуйте!\nКомпания Happytel приветствует Вас🤗. Спасибо за Ваш выбор😊', Markup.keyboard(['Связаться с оператором']).resize().extra())
    await ctx.scene.enter('menu')
})
phoneScene.on('text', async (ctx) => {
    ctx.session.phone = ctx.message.text
    await ctx.reply('Здравствуйте!\nКомпания Happytel приветствует Вас🤗. Спасибо за Ваш выбор😊', Markup.keyboard(['Связаться с оператором']).resize().extra())
    await ctx.scene.enter('menu')
})

// android menu
const androidScene = new Scene('android')
androidScene.enter(async (ctx) => {
    let msg = await ctx.reply('Выберите ваше устройсто',
        Markup.inlineKeyboard([[
            Markup.callbackButton('Meizu', 'meizu'),
            Markup.callbackButton('Samsung/LG', 'samsunglg')
        ], [
            Markup.callbackButton('Назад', 'back')
        ]]).extra())
    ctx.session.deleteMsg = msg.message_id
})
androidScene.action(/meizu|samsunglg|xiaomi/, async (ctx) => {
    ctx.session.device = ctx.callbackQuery.data
    let msg = await ctx.reply('Выберите метод настройки',
        Markup.inlineKeyboard([
            Markup.callbackButton('APN', 'apn'),
            Markup.callbackButton('Роуминг', 'roaming'),
        ]).extra())
    ctx.session.deleteMsg = msg.message_id
})
androidScene.action(/apn|roaming/, async (ctx) => {
    ctx.session.method = ctx.callbackQuery.data
    delete ctx.session.step // clear step before entering
    await ctx.scene.enter(ctx.session.device + '_' + ctx.session.method)
})
androidScene.action('back', async (ctx) => {
    await ctx.scene.enter('menu')
})

// ios menu
const iosScene = new Scene('ios')
iosScene.enter(async (ctx) => {
    ctx.session.device = 'ios'
    let msg = await ctx.reply('Выберите метод настройки',
        Markup.inlineKeyboard([[
            Markup.callbackButton('APN', 'apn'),
            Markup.callbackButton('Роуминг', 'roaming'),
        ], [
            Markup.callbackButton('Назад', 'back')
        ]]).extra())
    ctx.session.deleteMsg = msg.message_id
})
iosScene.action(/apn|roaming/, async (ctx) => {
    ctx.session.method = ctx.callbackQuery.data
    delete ctx.session.step // clear step before entering
    await ctx.scene.enter(ctx.session.device + '_' + ctx.session.method)
})
iosScene.action('back', async (ctx) => {
    await ctx.scene.enter('menu')
})

// menu
const menuScene = new Scene('menu')
let sendMenu = async (ctx, id) => {
    let msg = await ctx.telegram.sendMessage(id, 'Для того, чтобы получить инструкцию необходимо выбрать операционную систему Вашего устройства',
        Markup.inlineKeyboard([
            Markup.callbackButton('Android', 'android'),
            Markup.callbackButton('iOS', 'ios')
        ]).extra())
    ctx.session.deleteMsg = msg.message_id
    // handle admin with helpers.getSession
} // save this function to use later
menuScene.enter(async (ctx) => {
    await sendMenu(ctx, ctx.from.id)
})
menuScene.action(/android|ios/, async (ctx) => {
    await ctx.scene.enter(ctx.callbackQuery.data)
})

// setup bot and sessions
const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
bot.use((new LocalSession({
    database: 'sessions.json',
    getSessionKey: function (ctx) {
        return ctx.from.id
    } // only user session handling
})).middleware())

const meizuApn = new Screens('meizu_apn', 4, [
    'Первый шаг: SIM-карты и сети',
    'Второй шаг: Точка доступа (APN)',
    'Третий шаг: Добавить APN',
    'Четвертый шаг: Ввести APN и Имя (internet, internet)'])
const meizuRoaming = new Screens('meizu_roaming', 3, [
    'Первый шаг: SIM-карты и сети',
    'Второй шаг: Интернет-роуминг',
    'Третий шаг: Нужно включить данные в роуминге'])
const iosApn = new Screens('ios_apn', 3, [
    'Первый шаг: Сотовая связь',
    'Второй шаг: Заходим в сотовая сеть и передача данных',
    'Третий шаг: Указываем имя и название APN - internet'
])
const iosRoaming = new Screens('ios_roaming', 5, [
    'Первый шаг: Сотовая связь',
    'Второй шаг: Сотовые данные',
    'Третий шаг: Параметры данных',
    'Четвертый шаг: Роуминг данных',
    'Пятый шаг: Выбрать режим LTE'])
const samsungLgApn = new Screens('samsunglg_apn', 6, [
    'Первый шаг: Подключения',
    'Второй шаг: Мобильные сети',
    'Третий шаг: Точка доступа',
    'Четвертый шаг: Добавить',
    'Пятый шаг: Введите имя и точку доступа (internet, internet)',
    'Шестой шаг: Сохранить'
])
const samsungLgRoaming = new Screens('samsunglg_roaming', 6, [
    'Первый шаг: Подключения',
    'Второй шаг: Использование данных',
    'Третий шаг: Включите использование мобильных данных',
    'Четвертый шаг: Вернитесь назад',
    'Пятый шаг: Мобильные сети',
    'Шестой шаг: Включите данные в роуминге'
])

// setup scenes
const stage = new Stage([registerScene, nameScene, phoneScene, menuScene, androidScene, iosScene,
    meizuApn, meizuRoaming, samsungLgApn, samsungLgRoaming, iosApn, iosRoaming])
bot.use(async (ctx, next) => {
    try {
        await ctx.deleteMessage(ctx.session.deleteMsg)
    } catch (e) { }
    return next() // pass through
}) // delete old inline message
bot.use(stage.middleware())
bot.start((ctx) => ctx.scene.enter('register'))

bot.catch((err, ctx) => {
    console.log(err) // unhandled errors (known: connected user blocked bot)
    ctx.reply('Возникла ошибка, наберите пожалуйста /start')
})

// handle global commands, actions, messages
bot.command('addadmin', async (ctx) => {
    if (ctx.session.superuser) {
        let parts = ctx.message.text.split(' ')
        let username = parts[1]
        let user = ctx.sessionDB.get('sessions').find((s) => s.data.username == username).value()
        if (user) {
            user.data.admin = true
            helpers.saveSession(ctx.sessionDB, user.id, user.data)
            ctx.reply('Администратор зарегестрирован')
        } else {
            ctx.reply('Пользователь не найден')
        }
    } else {
        ctx.reply('Недостаточно прав')
    }
})

// listen callback query starting with connect
bot.action(/connect/, async (ctx, next) => {
    // auth
    if (!ctx.session.admin && !ctx.session.superuser) {
        await ctx.telegram.sendMessage(ctx.from.id, 'Недостаточно прав')
        return next() // pass through
    }
    // ctx.from.id - admin, callbackQuery.data - user
    let user = ctx.callbackQuery.data.substring(8)
    // change message if connected
    let me = await ctx.telegram.getMe()
    let keyboard = Markup.inlineKeyboard([
        Markup.urlButton('Перейти к боту', 'https://t.me/' + me.username)
    ]).extra()

    // try edit msg on client
    try {
        await ctx.telegram.editMessageText(process.env.TELEGRAM_NOTIFICATIONS,
            ctx.session.notificationId, null, ctx.session.notification + '\n\nСтатус: В процессе', keyboard)
    } catch (e) {}

    let endDialog = Markup.keyboard(['Завершить диалог']).resize().extra()
    // set conversation of admin
    ctx.session.conversation = user
    await ctx.telegram.sendMessage(ctx.from.id, 'Вы начали общение с пользователем', endDialog)
    // set conversation of user
    let session = await helpers.getSession(ctx.sessionDB, user)
    session.conversation = ctx.from.id
    await helpers.saveSession(ctx.sessionDB, user, session)
    await ctx.telegram.sendMessage(user, 'Оператор подключился', endDialog)
    // try edit msg on conversation user
    try {
        await ctx.telegram.editMessageText(process.env.TELEGRAM_NOTIFICATIONS,
            session.notificationId, null, session.notification + '\n\nСтатус: В процессе', keyboard)
    } catch (e) {}
    // end
    await ctx.answerCbQuery()
})
bot.hears('Завершить диалог', async (ctx) => {
    // check in which session notification is stored, then edit
    tryCloseNotification = async (session) => {
        if (session.notificationId) {
            try {
                await ctx.telegram.editMessageText(process.env.TELEGRAM_NOTIFICATIONS,
                    session.notificationId, null, session.notification + '\n\nСтатус: Завершен',
                    { reply_markup: null })
                delete session.notificationId
                delete session.notification
            } catch (e) {} // prevent editing/deleting error
        }
    }

    if (ctx.session.conversation) {
        // clear conversation user (HACK with manual scene.enter)
        let user = ctx.session.conversation
        await ctx.telegram.sendMessage(ctx.session.conversation, 'Диалог завершен', Markup.keyboard(['Связаться с оператором']).resize().extra())
        let session = await helpers.getSession(ctx.sessionDB, user)
        await tryCloseNotification(session)
        delete session.conversation
        session['__scenes'].current = 'menu' // set current scene to menu
        await helpers.saveSession(ctx.sessionDB, user, session)
        await sendMenu(ctx, user) // and send it
        // clear self
        await ctx.reply('Диалог завершен', Markup.keyboard(['Связаться с оператором']).resize().extra())
        delete ctx.session.conversation
        await tryCloseNotification(ctx.session)
        await ctx.scene.enter('menu')
    }
})
bot.hears('Связаться с оператором', async (ctx) => {
    let text = `Имя пользователя: ${ctx.session.name}\nНомер телефона: ${ctx.session.phone}\n`
    if (ctx.from.username) {
        text += `Юзернейм @${ctx.from.username}\n`
    }
    let keyboard = Markup.inlineKeyboard([
        Markup.callbackButton('Ответить', 'connect:' + ctx.from.id) // save user id
    ]).extra()
    await ctx.reply('Ждите ответ оператора') // to user
    let msg = await ctx.telegram.sendMessage(process.env.TELEGRAM_NOTIFICATIONS, text, keyboard)
    ctx.session.notificationId = msg.message_id
    ctx.session.notification = msg.text
})
bot.on('text', async (ctx, next) => {
    if (ctx.session.conversation) { // has conversation with operator/user
        return ctx.telegram.sendMessage(ctx.session.conversation, ctx.message.text)
    } else {
        return next() // pass through
    }
})

module.exports = bot
