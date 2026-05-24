const express=require('express');

const requestLogger=require('./middleware/requestLogger');
const notFound=require('./middleware/notfound');
const errorHandler=require('./middleware/errorhandler');
const validateUser=require('./middleware/validateuser');

const app=express();
const PORT=3000;

app.use(requestLogger);

app.use(express.json);

app.use(express.urlencoded({extended:true}));

let users = [
  { id: 1, name: 'Rahul Singh',  email: 'rahul@example.com', age: 20 },
  { id: 2, name: 'Priya Sharma', email: 'priya@example.com', age: 21 },
  { id: 3, name: 'Amit Kumar',   email: 'amit@example.com',  age: 22 },
];

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`
  });
});

app.get('/api/users', (req, res) => {
  const { name, age, sort } = req.query;
  let result = [...users]; // copy array — don't mutate original

  // Filter by name if provided
  if (name) {
    result = result.filter(u =>
      u.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  // Filter by age if provided
  if (age) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'age must be a number'
      });
    }
    result = result.filter(u => u.age === ageNum);
  }

  // Sort if provided
  if (sort === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'age') {
    result.sort((a, b) => a.age - b.age);
  }

  res.status(200).json({
    count: result.length,
    users: result
  });
});

app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);

  // Handle non-numeric id
  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'User ID must be a number'
    });
  }

  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No user found with id ${id}`
    });
  }

  res.status(200).json({ user });
});

app.post('/api/users', validateUser, (req, res) => {

  // By the time we're here, validation passed
  // req.body.name and req.body.email are already sanitized
  const { name, email, age } = req.body;

  // Check for duplicate email
  const duplicate = users.find(
    u => u.email === email.toLowerCase()
  );

  if (duplicate) {
    return res.status(409).json({
      error: 'Conflict',
      message: `User with email ${email} already exists`
    });
  }

  // Generate new ID
  const newId = users.length > 0
    ? Math.max(...users.map(u => u.id)) + 1
    : 1;

  const newUser = {
    id: newId,
    name,
    email,
    age: age || null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  res.status(201).json({
    message: 'User created successfully',
    user: newUser
  });
});

app.put('/api/users/:id', validateUser, (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No user found with id ${id}`
    });
  }

  const { name, email, age } = req.body;

  // Update the user
  users[userIndex] = {
    ...users[userIndex],  // keep existing fields (like createdAt)
    name,
    email,
    age: age || null,
    updatedAt: new Date().toISOString()
  };

  res.status(200).json({
    message: 'User updated successfully',
    user: users[userIndex]
  });
});

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `No user found with id ${id}`
    });
  }

  // Remove from array
  const deletedUser = users.splice(userIndex, 1)[0];

  res.status(200).json({
    message: 'User deleted successfully',
    deletedUser
  });
});

app.use(notFound);

// Catches all errors thrown or passed via next(err)
// Must be absolutely last
app.use(errorHandler);


// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Routes available:');
  console.log('  GET    /health');
  console.log('  GET    /api/users');
  console.log('  GET    /api/users/:id');
  console.log('  POST   /api/users');
  console.log('  PUT    /api/users/:id');
  console.log('  DELETE /api/users/:id');
  console.log('  GET    /test-error');
});