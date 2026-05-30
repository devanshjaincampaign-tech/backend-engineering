require('dotenv').config();
const jwt7=require('jsonwebtoken');

const verifytoken=(req,res,next)=>{
    const authheader=req.headers['authorization'];

    if(!authheader){
        return res.status(401).json({
            error: 'Unauthorized',
            message:'No authorization header provided'
        });
    }

    if(!authheader.startsWith('Bearer')){
        return res.status(401).json({
            error:'Unauthorized',
            message:'Authorization header must start with Bearer'
        });
    }

    const token=authheader.split(' ')[1];

    if(!token){
        return res.status(401).json({
            error:'Unauthorized',
            message:'No token provided'
        });
    }
    
    try{

        const decoded=jwt7.verify(token,process.env.JWT_ACCESS_SECRET);
        req.user=decoded;
        next();

    }
    catch(err){
        if(err.name==='TokenExpiredError'){
            return res.status(401).json({
                error:'Token Expired',
                message:'Your session has expired. please log in again'
            });
        }

        if(err.name==='JsonWebTokenError'){
            return res.status(401).json({
                error:'Invalid Token',
                message:'Token is not valid'
            });
        }

        return res.status(401).json({
            error:'Unauthorized',
            message:'Could not verify Token'
        });
    }
};

module.exports=verifytoken;