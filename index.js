const { Telegraf } = require('telegraf')

const token = '2094134745:AAENFLbt4bXWCfngzmj-EvMMJg8VdR0nPnc'
const bot = new Telegraf(token)

bot.command('info', async (ctx) => {
    await  ctx.reply('Данный бот предназначен для отслеживания скидок сайта Rozetka')
})

bot.command('start', async (ctx) => {
    await  ctx.reply('Данный бот предназначен для отслеживания скидок сайта Rozetka. \nПосле добавления товара для отслеживания, вы будете уведомлены, когда его цена изменится. \nДля добавления товара вызовите команду /add')
    await  ctx.telegram.setMyCommands([
        {command: 'info', description: 'Информация о боте'},
        {command: 'add', description: 'Добавление товара в отслеживаемые'}
    ])
})

bot.command('add', async (ctx) => {
    let link;
    ctx.reply('Отправьте ссылку на товар, который вы хотите отслеживать')

    bot.on('message', async (msg) => {

        if (msg.message.text.startsWith('https://rozetka.com.ua/')) {
            link = msg.message.text;
            console.log(link);
            msg.reply('Отлично! Товар добавлен')
        } else {
            await msg.reply('Вы ввели некорректную ссылку')
        }
    })
})



bot.launch()