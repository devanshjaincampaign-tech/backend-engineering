//Http server using express.js, which provides betterr tool to create a server

const express = require('express');

const app=express();

app.use(express.json()); //middleware to parse JSON bodies

let users = [
  { id: 1, name: 'Rahul Singh', email: 'rahul@example.com', age: 20 },
  { id: 2, name: 'Priya Sharma', email: 'priya@example.com', age: 21 },
  { id: 3, name: 'Amit Kumar', email: 'amit@example.com', age: 22 },
  { id: 4, name: 'Neha Gupta', email: 'neha@example.com', age: 20 },
];

app.get('/users',(req,res)=>{
    res.status(200).json({
        count:users.length,
        users: users
    });
});

// route params are string by default hence, they have to be converted to the string 

app.get('/users/:id',(req,res)=>{
    const id=parseInt(req.params.id);
    const user=users.find(u=>u.id===id);
    if(!user){
        return res.status(400).json({
            error:'User not found',
            message:`No user exists with id${id}`
        });
    }

    res.status(200).json({user});
})


app.post('/users',(req,res)=>{
    const{name,email,age}=req.body;

    if(!name || !emcial){
        return res.status(400).json({
            error:'Validation failed',
            message:'name and email are required'
        });
    }
    const esistingUser=users.find(u => u.email ===email);
    if(existingUser){
        return res.status(409).json({
            error:'conflict',
            message:'A user with this email already exists'
        });
    }

    const newId = Math.max(...users.map(u=>u.id))+1;
    const newUser={id:newId,name,email,age:age||null};
    users.push(newUser);

    res.status(201).json({message:'User created successfully',user:newUser});
});

app.use((req,res)=>{
    res.status(404).json({error:`Route ${req.method} ${req.url} not found`});
});

app.listen(3000,()=>{
    console.log('Server running on http://localhost:3000');
})

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