const keys = require('./keys.js');

//Express App Setup
const express= require('express');
const bodyParser=require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


//Postgres client setup

const {Pool}=require('pg');
const pgClient = new Pool({
    user:keys.pgUser,
    database:keys.pgDatabase,
    host:keys.pgHost,
    password:keys.pgPassword,
    port:keys.pgPORT
});
pgClient.on('error',()=> console.log('Lost Pg connection'));


pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
.catch(err=>console.log("error connecting" + err));


//redis client setup
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

//Express route handler

app.get('/',(req,res)=>{
    res.send('Hello Bliss');
});
app.get('/values/all',async (req,res)=>{
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
});
app.get('/values/current',async (req,res)=>{
    redisClient.hgetall('values',(err,values)=>{
        res.send(values);
    });
});
app.post('/values',async (req,res)=>{
    const index=req.body.index;
    if(parseInt(index)>40){
        return res.sendStatus(422).send('Index too high');
    }
    redisClient.hset('values',index,'Nothing yet!');
    redisPublisher.publish('insert',index);
    pgClient.query('INSERT INTO values(number) VALUES($1)',[index]);
    res.send({working:true});
});

app.listen(5000,()=>console.log('listening'));