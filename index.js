const { Telegraf,Scenes, session } = require('telegraf')
const { leave, enter } = Scenes.Stage

const token = '2094134745:AAENFLbt4bXWCfngzmj-EvMMJg8VdR0nPnc'
const bot = new Telegraf(token)

const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://admin:admin@cluster0.lnmty.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const collection = client.db("test").collection("devices");
    client.close();
});

const addFavourite = new Scenes.BaseScene('addFavourite')
addFavourite.enter((ctx) => ctx.reply('Отправьте ссылку на товар, который вы хотите отслеживать'))
addFavourite.on('message', async (msg) => {

    if (msg.message.text.startsWith('https://rozetka.com.ua/')) {
        let link = msg.message.text;
        await msg.reply('Отлично! Товар добавлен')
    } else {
        await msg.reply('Вы ввели некорректную ссылку')
    }
    await msg.scene.leave();
})

const stage = new Scenes.Stage([addFavourite]);
bot.use(session());
bot.use(stage.middleware());


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
    await  ctx.scene.enter('addFavourite')
})



bot.launch()