//Http server using express.js, which provides betterr tool to create a server

const express = require('express');
const app=express();

app.use(express.json()); //middleware to parse JSON bodies

app.get('/health',(req,res)=>{
    res.status(200).json({
        status: 'ok',
        message: 'Server is waiting',
        timestamp: new Date().toISOString()
    });
});

app.get('hello',(req,res)=>{
    res.status(200).json({message: 'hello from Express!'});
});

app.use((req,res)=>{
    res.status(404).json({error:'Route not found'});
});

app.listen(3000,()=>{
    console.log('Express server on http://localhost:3000');
});