const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')

// name of screen e.g ios, samsung, meizu
// count - count of screenshot steps
module.exports = function (name, count, captions) {
    let scn = new Scene(name);
    scn.enter(async (ctx) => {
        let step = ctx.session.step || 1
        ctx.session.step = step
        let msg = await ctx.replyWithPhoto({
            source: `resources/${name}_${step}.jpg`
        }, Markup.inlineKeyboard([
            Markup.callbackButton('Назад', 'back'),
            Markup.callbackButton(step == count ? 'В меню' : 'Вперед', 'next')]
        ).extra({
            caption: captions[step - 1]
        }))
        ctx.session.deleteMsg = msg.message_id
    })
    scn.action(/back|next/, async (ctx, next) => {
        try {
            await ctx.deleteMessage(ctx.session.deleteMsg)
        } catch (e) { }
        return next()
    })
    scn.action('back', async (ctx) => {
        if (ctx.session.step <= 1) {
            delete ctx.session.deleteMsg
            ctx.scene.enter('menu')
        } else {
            ctx.session.step--
            ctx.scene.enter(name)
        }
    })
    scn.action('next', async (ctx) => {
        if (ctx.session.step >= count) {
            delete ctx.session.deleteMsg
            ctx.scene.enter('menu')
        } else {
            ctx.session.step++
            ctx.scene.enter(name)
        }
    })
    return scn
}