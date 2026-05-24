/** REQUEST LOGGER MIDDLEWARE
 *
 * Purpose: Log every incoming request so you can see
 * what's happening on your server in real time.
 *
 * In production, companies use tools like Morgan or Winston
 * for this. We're building it from scratch so you understand
 * exactly what those tools do under the hood.
 */

const requestlogger=(req,res,next)=>{
    const start=Date.now();
    const timestamp=new Date().toISOString();

    console.log(`[${timestamp}]-->${req.method} ${req.url}`);

    const originaljson=res.json.bind(res);

    res.json=(body)=>{
        const duration = Date.npw()-start;
        console.log(`[${new Date().toISOString()}] <-- ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
        return originaljson.body;

    };
    next();
}

module.exports=requestlogger;