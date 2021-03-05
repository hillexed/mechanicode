
const {NodeVM, VM, VMScript} = require('vm2');

const RESULT_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
}

const ERROR_TYPES = {
    COMPILING: 'compiling',
    TIMEOUT: 'timeout',
    EXECUTION: 'during',
    ASYNC: 'async'
}

function executeCode(code){
    // returns {"resultType": RESULT_TYPES, "errorType": ERROR_TYPES, "error": string (optional), output: string (optional, only if the code ran)}

    let finalOutput = "";

    printFunc = function(thingToPrint){
        finalOutput += thingToPrint + "\n"
    }

    const vm = new VM({
        timeout: 1000,
        external: ["p5"],
        sandbox: {
            "print":printFunc,
            "console":{log: (x)=> printFunc(x)}}
    });

    try {
        var script = new VMScript(code).compile();
    } catch (err) {
        return {
            "resultType":RESULT_TYPES.ERROR,
            "errorType":ERROR_TYPES.COMPILING,
            "error": err
        };
    }

    try{
        var returnVal = vm.run(script);
    }catch (err) {
        if(err.message == "Script execution timed out."){
            return {
                "resultType":RESULT_TYPES.ERROR,
                "errorType":ERROR_TYPES.TIMEOUT,
                "error": err,
                "output": finalOutput
            };
        }else{
            return {
                "resultType":RESULT_TYPES.ERROR,
                "errorType":ERROR_TYPES.EXECUTION,
                "error": err,
                "output": finalOutput
            };
        }
    }

    process.on('uncaughtException', (err) => {
        //Something went wrong asynchronously while running that script
        return {
            "resultType":RESULT_TYPES.ERROR,
            "errorType":ERROR_TYPES.ASYNC,
            "error": err,
            "output": finalOutput
        };
    })
    
    if(returnVal != undefined){
        finalOutput += returnVal;
    }

    return {"resultType": RESULT_TYPES.SUCCESS, "output": finalOutput};

}

module.exports = {executeCode, RESULT_TYPES, ERROR_TYPES};

