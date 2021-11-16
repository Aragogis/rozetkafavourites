// нужно дописать парсинг цены с сайта(1), проверку актуальности цены(2), отправление сообщения пользователю, при изменении цены(3) и возможность удаления ссылок из отслеживаемых(4).

const { Telegraf,Scenes, session, Markup } = require('telegraf')
const { leave, enter } = Scenes.Stage
const { MongoClient } = require('mongodb')
const {token} = require('./config.json')

const cheerio = require('cheerio')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const cron = require('node-cron')
const {add} = require("cheerio/lib/api/traversing");

const LAUNCH_PUPPETEER_OPTS = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
    ]
};
const PAGE_PUPPETEER_OPTS = {
    networkIdle2Timeout: 5000,
    waitUntil: 'networkidle2',
    timeout: 3000000
};

const bot = new Telegraf(token)

//bot.use(Telegraf.log())

const uri = "mongodb+srv://admin:admin@cluster0.lnmty.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
const collection = client.db("TGBot").collection("Users")



const addFavourite = new Scenes.BaseScene('addFavourite')
const stage = new Scenes.Stage([addFavourite])
bot.use(session())
bot.use(stage.middleware())

/*bot.command('upd', async (ctx) => {
    await checkForUpdates()
})*/

bot.hears('Список отслеживаемых товаров', async (ctx) => {
    const userId = ctx.message.chat.id;

    await client.connect()
    await collection.find({userId : userId}).forEach(function (user) {user.links.forEach(link => ctx.reply(link))})
    await client.close()


})

bot.hears('Добавить товар в отслеживаемые', async (ctx) => {
    await  ctx.scene.enter('addFavourite')
})

bot.hears('Удалить все товары из отслеживаемых', async (ctx) => {
    const userId = ctx.message.chat.id;

    await client.connect()
    await collection.deleteOne({userId : userId})
    await client.close()

    await ctx.reply('Отлично! Товары удалены')
})


addFavourite.enter(async (ctx) => {
    await ctx.reply('Отправьте ссылку на товар, который вы хотите отслеживать', Markup.removeKeyboard())
})
addFavourite.on('message', async (ctx) => {
    if (ctx.message.text.startsWith('https://rozetka.com.ua/')) {
        ctx.reply('Пожалуйста, подождите...')

        const link = ctx.message.text
        const userId = ctx.message.chat.id
        const price = await parse(link);
        console.log(price);
        //  тут должна парсится цена с ссылки link  (1)


        await client.connect()
        const count = await collection.find({userId : userId}).toArray()
        if( count.length === 0) await collection.insertOne({"userId" : userId, "links" : [link], "prices" : [price] })
        else await collection.updateOne({userId : userId}, {$addToSet: { links: link}, $push: { prices : price }})
        await client.close()

        await ctx.reply('Отлично! Товар добавлен', Markup.keyboard([
            Markup.button.text('Добавить товар в отслеживаемые'),
            Markup.button.text('Список отслеживаемых товаров'),
            Markup.button.text('Удалить все товары из отслеживаемых')
        ]).resize())

    } else {
        await ctx.reply('Вы ввели некорректную ссылку', Markup.keyboard([
            Markup.button.text('Добавить товар в отслеживаемые'),
            Markup.button.text('Список отслеживаемых товаров'),
            Markup.button.text('Удалить все товары из отслеживаемых')
        ]).resize())
    }
    await ctx.scene.leave()
})

bot.command('start', async (ctx) => {
    await  ctx.reply('Данный бот предназначен для отслеживания скидок сайта Rozetka. \nПосле добавления товара для отслеживания, вы будете уведомлены, когда его цена изменится.', Markup.keyboard([
        Markup.button.text('Добавить товар в отслеживаемые'),
        Markup.button.text('Список отслеживаемых товаров'),
        Markup.button.text('Удалить все товары из отслеживаемых')
    ]).resize())
})

async function checkForUpdates(){
    let prices_new = []

    await client.connect()


    for (let user of await collection.find().toArray()) {
        for (let link of user.links) {
            prices_new.push(await parse(link))
        }
        let i = 0
        for(let oldPrice of user.prices) {
            if(prices_new[i] < oldPrice) {
                await bot.telegram.sendMessage(user.userId, `Товар ${user.links[i]} сейчас по скидке.\n Успейте купить за ${prices_new[i]} грн!`)
                await collection.updateOne(
                    {userId : user.userId},
                    {$set : {
                            [`prices.${i}`] : prices_new[i]
                        }
                    })
            }
            else if(prices_new[i] > oldPrice) {
                await bot.telegram.sendMessage(user.userId, `Товар ${user.links[i]} подорожал. Теперь он стоит ${prices_new[i]} грн`)
                await collection.updateOne(
                    {userId : user.userId},
                    {$set : {
                            [`prices.${i}`]: prices_new[i]
                        }
                    })
            }
            i++
        }
        prices_new = [];
    }
    await client.close()
}


async function parse(link)
{
        const browser = await puppeteer.launch(LAUNCH_PUPPETEER_OPTS)

        const page = await browser.newPage()
        await page.goto(link, PAGE_PUPPETEER_OPTS)
        const pageContent = await page.content()
        await browser.close()

        const $ =  await cheerio.load(pageContent)

        let price = await $('.product-prices__big').text()
        price = Number( price.replace(/[^0-9]/g, ''))

        return price
}

cron.schedule('30 20 * * *', async () => {
    await checkForUpdates()
}, {
    scheduled: true,
    timezone: "Europe/Kiev"
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))