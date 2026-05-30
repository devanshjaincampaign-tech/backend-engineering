require('dotenv').config();

const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const pool=require('../db');

const createAccessToken=(userId,email)=>{
    return jwt.sign({
        userId:userId,
        email:email,
        type:'access'
    },
    process.env.JWT_ACCESS_SECRET,
    {expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'}
    );
}

const createRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId: userId,
      type:   'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

const register=async(req,res)=>{
    try{
        const{name,email,password}=req.body;

        if(!name || !email || !password){
            return res.status(400).json({
                error:'Validation Failed',
                message: 'name,email,and password are all required'
            });
        }

        if(name.trim().length<2){
            return res.status(400).json({
                error: 'Validation failed',
                message:'Name Must be at least 2 characters'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.status(400).json({
                error:'Validation Failed',
                message:'Please provide a Valid email address'
            });
        }

        if(password.length<8){
            return res.status(400).json({
                error:'Validation Failed',
                message:'Password must be at least 8 characters'
            });
        }

        const existingUser=await pool.query(
            'SELECT id FROM users WHERE email=$1',
            [email.toLowerCase().trim()]
        );

        if (existingUser.rows.length>0){
            return res.status(400).json({
                error:'Conflict',
                message:'An account with this email already exists'
            });
        }

        const saltRounds=12;
        const hashedPassword=await bcrypt.hash(password,saltRounds);

        const newUser=await pool.query(
            `INSERT INTO users (name,email,password)
            VALUES($1,$2,$3)
            RETURNING id,name,email,created_at`,

            [name.trim(),email.toLowerCase().trim(),hashedPassword]
        );

        const user=newUser.rows[0];

        const accessToken  = createAccessToken(user.id, user.email);
        const refreshToken = createRefreshToken(user.id);

        const refreshExpiry = new Date();
        refreshExpiry.setDate(refreshExpiry.getDate() + 7);

        await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, refreshExpiry]
    );

     res.status(201).json({
      message: 'Account created successfully',
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        createdAt: user.created_at
      },
      tokens: {
        accessToken:  accessToken,
        refreshToken: refreshToken,
        expiresIn:    '15 minutes'
      }
    });
    }
    catch(err){
        console.error('Register error:',err.message);
        res.status(500).json({error:'Registration failed'});
    }
};

const login=async(req,res)=>{
    try{
        const{email,password}=req.body;

        if(!email || !password){
            return res.status(400).json({
                error:'Validation failed',
                message:'email and password are required'
            });
        }

        const result=await pool.query(
            'SELECT * FROM users WHERE email =$1',
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
      return res.status(401).json({
        error:   'Invalid Credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        error:   'Invalid Credentials',
        message: 'Email or password is incorrect'
      });
    }

    const accessToken  = createAccessToken(user.id, user.email);
    const refreshToken = createRefreshToken(user.id);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, refreshExpiry]
    );


    res.status(200).json({
      message: 'Login successful',
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email
      },
      tokens: {
        accessToken:  accessToken,
        refreshToken: refreshToken,
        expiresIn:    '15 minutes'
      }
    });
    }

    catch(err){
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
};


const refreshToken=async(req,res)=>{
    try{
        const{
            refreshToken:token
        }=req.body;

        if(!token){
            return res.status(400).json({
                error: 'Bad Request',
                message:'Refresh token is required'
            });
        }

        let decoded;
        try{
            decoded=jwt.verify(token,process.env.JWT_REFRESH_EXPIRES);
        }catch(err){
            return res.status(401).json({
                error:'invalid token',
                message: 'Refresh token is  not valid or has expired'
            });
        }
        const storedToken = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1
       AND user_id = $2
       AND expires_at > NOW()`,
      [token, decoded.userId]
    );

     if (storedToken.rows.length === 0) {
      return res.status(401).json({
        error:   'Invalid Token',
        message: 'Refresh token not found or expired'
      });
    }

    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [decoded.userId]
    );

     if (userResult.rows.length === 0) {
      return res.status(401).json({
        error:   'Unauthorized',
        message: 'User no longer exists'
      });
    }

    const user = userResult.rows[0]

     const newAccessToken = createAccessToken(user.id, user.email);

    res.status(200).json({
      message:     'Token refreshed successfully',
      accessToken: newAccessToken,
      expiresIn:   '15 minutes'
    });

    }

    catch (err) {
    console.error('Refresh token error:', err.message);
    res.status(500).json({ error: 'Could not refresh token' });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        error:   'Bad Request',
        message: 'Refresh token is required'
      });
    }

    // Delete the refresh token from database
    await pool.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [token]
    );

    // Even if token wasn't found, return success
    // User is effectively logged out either way
    res.status(200).json({
      message: 'Logged out successfully'
    });

  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed' });
  }
};

const getMe = async (req, res) => {
  try {
    // req.user was set by the verifyToken middleware
    // It contains: { userId, email, type, iat, exp }
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:   'Not Found',
        message: 'User not found'
      });
    }

    res.status(200).json({
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe
};