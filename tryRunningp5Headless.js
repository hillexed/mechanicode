const jsdom = require("jsdom");
const fs = require('fs').promises;
const { createCanvas, loadImage } = require('canvas'); //think i dont need this
const {NodeVM} = require('vm2');


let p5LibraryCode = null;
let webmWriterCode = null;


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

async function runP5Code(drawCode){
    return new Promise(async function(resolve, reject) {
        if(p5LibraryCode === null){
            p5LibraryCode = await fs.readFile('./lib/p5.js', 'utf8');
        }
        if(webmWriterCode === null){
            webmWriterCode = await fs.readFile('./lib/webm-writer-0.3.0.js', 'utf8');
        }

        const dom = new jsdom.JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, { predendToBeVisual: true, runScripts: 'outside-only', url: "http://addingthismakeslocalstoragenotfail.com" });
        const window = dom.window;
        const document = dom.window.document;

        let imageRecieved = false;
        function _recieveWebmBlob(blob){
            if(imageRecieved)return;
            try{
                imageRecieved = true;
                resolve(blob);
            }catch(err){
                throw err;
            }
        }

        function _errorNoDraw(){
            throw new Error("We need a function named draw()!");
        }
        function _errorNoSetup(){
            throw new Error("We need a function named setup()!");
        }


        const vm = new NodeVM({
            timeout: 1000,
            sandbox: {
                "window":window,
                "document":document,
                //"createCanvas":createCanvas,
                "navigator":{
                    "userAgent": "no"
                },
                
                "screen":{
                    width:600,
                    height:600,
                },
                "_sendBlobOut": _recieveWebmBlob,
                "_errorNoSetup": _errorNoSetup,
                "_errorNoDraw": _errorNoDraw,
                numFrames: 3, //eventually, framerate * duration
                framerate: 3,
                localStorage: {
                    setItem: ()=>{}, //mock so that accessing won't error
                    removeItem: ()=>{},
                },
            },
            require: { external: {
                modules: ["sharp"], //used to convert PNG to WEBP for webm export
            }},
        });


        const fullCode = drawCode + 
        `
        try{
            window.draw = draw; //needed for p5 to detect its presence and run
        } catch {
            _errorNoDraw();
            return;
        }

        let userSetup = ()=>{createCanvas(600,600)};
        try{
            window.setup = setupHook; //needed for p5 to detect its presence and run
            userSetup = setup;
        }  catch {
            _errorNoSetup();
            return;
        }
        module = undefined; //trick WebMWriter into thinking it's running in a browser so it won't try require("fs") and crash because of the sandbox
        const sharp = require("sharp");
        `  + 
        webmWriterCode + 
        p5LibraryCode + 
        `
        let videoWriter = new window.WebMWriter({
            quality: 0.95, //1.0 not supported :(
            frameRate: framerate,
            transparent: false,
        });

        function getWebpFromCanvas(canvas, callback){
            //get a PNG from the canvas, turn it into a webp
            const bufferData = canvas.toDataURL().slice("data:image/png;base64,".length);
            const buffer=Buffer.from(bufferData,'base64');
            let webpFrame = sharp(buffer).webp({ lossless: false }).toBuffer().then( data => {
                const base64webpstring = "data:image/webp;base64,"+data.toString('base64');
                callback(base64webpstring);
            }).catch(err => { console.error("Error converting frame to webp: " + err);});
        }

        function setupHook(){ //p5 calls this, this calls user-provided setup(). make p5-registered functions like window.background available as "background()" and set up rendering 
            for(var addedP5Func in window){  
             global[addedP5Func] = window[addedP5Func]
            }
            let canvas = this.canvas; //grab canvas
            userSetup();

            let numFramesCaptured = 0;
            let _vidSent = false;

            _registeredMethods.post.push( ()=>{
                //I could call canvas.toDataURL() here to get a PNG, but I want to pack these images into a webm (and do it in JS without touching the filesytem) so all this mess has to exist :(
                getWebpFromCanvas(canvas, (base64webpstring) => {
                    videoWriter.addFrame( base64webpstring );
                    numFramesCaptured += 1;
                    if(numFramesCaptured > numFrames && !_vidSent){
                        noLoop();
                        global.Blob = window.Blob;
                        videoWriter.complete().then((blob) => {
                            const fileReader = new window.FileReader();
                            fileReader.addEventListener("load", () => {
                                let buff = Buffer.from(fileReader.result, "");
                                console.log(buff.toString());
                                console.log(5);
                                _sendBlobOut(buff.toString());
                                //_sendBlobOut(fileReader.result);
                                _vidSent = true;
                            });
                            fileReader.readAsDataURL(blob);
                            
                        });
                    }
                });
            });
        }
        `;

        try{
            let returnVal = vm.run(fullCode, "script.js");
        }catch (err) {
            if(err.message == "Script execution timed out."){
                reject({
                    "resultType":RESULT_TYPES.ERROR,
                    "errorType":ERROR_TYPES.TIMEOUT,
                    "error": err
                });
            }else{
                reject({
                    "resultType":RESULT_TYPES.ERROR,
                    "errorType":ERROR_TYPES.EXECUTION,
                    "error": err
                });
            }
            return;
        }
    })
}




//test
const drawCode = `
function setup() {
  createCanvas(400, 400);
  console.log("setup called!");
}

let x = 0;

function draw() {
  console.log("Draw called!");
  background((x + 50) % 255);
  ellipse(50,50,80,80);
}`;

runP5Code(drawCode).then(async (webm)=>{await fs.writeFile("temp.webm",webm);}).catch((err)=>{console.error(err)});


//runP5Code("function setup(){}; function draw(){}").then((webm)=>{console.log(webm)}).catch((err)=>{console.error(err)});
