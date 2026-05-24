/**
 * VALIDATION MIDDLEWARE
 *
 * Purpose: Validate request data BEFORE it reaches
 * your route handler. If data is invalid, reject it
 * immediately with a clear error message.
 *
 * Why middleware instead of validating inside the route?
 * Because validation logic is reusable. You might have
 * POST /users and PUT /users/:id both needing the same
 * validation. Write once, use anywhere.
 *
 * In real projects, companies use libraries like:
 * - Joi
 * - Zod
 * - express-validator
 *
 * We're building it manually so you understand what
 * those libraries do internally.
 */

const validateuser=(req,res,next)=>{
  const{name,email,age}=req.body;

  const errors=[];

  if(!name){
    errors.push({
      field:'name',
      message:'name is required'
    });}
    else if(typeof name!=='string'){
      errors.push({
        field:'name',
        message:'name must be a string'
      });
    }
    else if(name.trim().length>50){
      errors.push({
        field:'name',
        message:'name must be less than 50 characters'
      });
    }

    if(!email){
      errors.push({
        field:'email',
        message:'email is required'
      });
    }

    else{
      const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!emailRegex.test(email)){
        errors.push({
          field:'email',
          message:'email must be valid email address'
        });
      }
    }

    if(age!==undefined){
      if(typeof age!==number){
        errors.push({
          field:'age',
          message:'age must be a number'
        });
      }
      else if(age<1 || age>120){
        errors.push({
          field:'age',
          message:'age must be between 1 and 120'
        });
      }
    }

    if(errors.length>0){

      return res.status(400).json({
        status:'error',
        error:'Validation failed',
        errors:errors
      });
    }

    req.body.name=name.trim();
    req.body.email=email.toLowerCase().trim();

    next();
  };

  module.exports=validateuser;