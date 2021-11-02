// нужно дописать парсинг цены с сайта(1), проверку актуальности цены(2), отправление сообщения пользователю, при изменении цены(3) и возможность удаления ссылок из отслеживаемых(4).

const { Telegraf,Scenes, session } = require('telegraf')
const { leave, enter } = Scenes.Stage
const { MongoClient } = require('mongodb')

const token = '2094134745:AAENFLbt4bXWCfngzmj-EvMMJg8VdR0nPnc'
const bot = new Telegraf(token)


const uri = "mongodb+srv://admin:admin@cluster0.lnmty.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
const collection = client.db("TGBot").collection("Users")

const addFavourite = new Scenes.BaseScene('addFavourite')
addFavourite.enter((ctx) => ctx.reply('Отправьте ссылку на товар, который вы хотите отслеживать'))
addFavourite.on('message', async (msg) => {

    if (msg.message.text.startsWith('https://rozetka.com.ua/')) {
        const link = msg.message.text;
        const userId = msg.message.chat.id;
        // const price = тут должна парсится цена с ссылки link  (1)
        await msg.reply('Отлично! Товар добавлен')

        await client.connect()
        const count = await collection.find({userId : userId}).toArray()
        if( count.length === 0) await collection.insertOne({"userId" : userId, "links" : [link], "prices" : [price] })
        else await collection.updateOne({userId : userId}, {$addToSet: {links: link}, $addToSet : {prices : price}})
        await client.close()

    } else {
        await msg.reply('Вы ввели некорректную ссылку')
    }
    await msg.scene.leave();
})

const stage = new Scenes.Stage([addFavourite])
bot.use(session())
bot.use(stage.middleware())


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
