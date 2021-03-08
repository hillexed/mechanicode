const jsdom = require("jsdom");
const fs = require('fs');

const { createCanvas, loadImage } = require('canvas');
const dom = new jsdom.JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, { predendToBeVisual: true, runScripts: 'outside-only', url: "http://addingthismakeslocalstoragenotfail.com" });
const window = dom.window;
const document = dom.window.document;


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

const {NodeVM} = require('vm2');


let images = []

let imageRecieved = false;
function _recieveWebmBlob(blob){
    try{
        imageRecieved = true;
        console.log(blob);
        
    }catch(err){
        console.error(err);   
    }
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
        numFrames: 3, //eventually, framerate * duration
        framerate: 3,
        localStorage: {
            setItem: ()=>{}, //mock so that accessing won't error
            removeItem: ()=>{},
        },
    },
    require: { external: {
        modules: ["sharp"],
    }},
});


//fs.readFile('./lib/p5.min.js', 'utf8' , (err, p5Code) => {

fs.readFile('./lib/p5.js', 'utf8' , (err, p5Code) => {
    fs.readFile('./lib/webm-writer-0.3.0.js', 'utf8' , (err2, webmWriterCode) => {
        if (err) {
            console.error(err)
            return
        }
        if (err2) {
            console.error(err2)
            return
        }
        console.log("Drawing!");

        const fullCode = drawCode + 
        `
        if(draw){window.draw = draw;} //needed for p5 to detect them
        if(setup){window.setup = setup;}
        module = undefined; //trick WebMWriter into not requiring fs
        const sharp = require("sharp");
        `  + 
        webmWriterCode + 
        p5Code + 
        `
        let originalSetup = setup //hook to make background() and line() available in global context
        let videoWriter = new window.WebMWriter({
            quality: 0.95, //1.0 not supported :(
            frameRate: framerate,
            transparent: false,
        });

        function getWebpFromCanvas(canvas, callback){
            const bufferData = canvas.toDataURL().slice("data:image/png;base64,".length);
            const buffer=Buffer.from(bufferData,'base64');
            let webpFrame = sharp(buffer).webp({ lossless: false }).toBuffer().then( data => {
                const base64webpstring = "data:image/webp;base64,"+data.toString('base64');
                callback(base64webpstring);
            }).catch(err => { console.error("Error converting frame to webp: " + err);});
        }

        window.setup = function(){
            for(var addedP5Func in window){  //make p5-registered functions like window.background available as "background()"
             global[addedP5Func] = window[addedP5Func]
            }
            let canvas = this.canvas; //grab canvas
            originalSetup();

            let numFramesCaptured = 0;
            _registeredMethods.post.push( ()=>{
                    //I could call canvas.toDataURL() here to get a PNG, but I want to pack these images into a webm (and do it in JS without touching the filesytem) so all this mess has to exist :(
                    getWebpFromCanvas(canvas, (base64webpstring) => {
                        videoWriter.addFrame( base64webpstring );
                        numFramesCaptured += 1;
                        if(numFramesCaptured > numFrames){
                            noLoop();
                            global.Blob = window.Blob;
                            videoWriter.complete().then((blob) => {
                                const fileReader = new window.FileReader();
                                fileReader.addEventListener("load", () => {
                                    _sendBlobOut(fileReader.result);
                                });
                                fileReader.readAsDataURL(blob);
                            });
                        }
                    });
            });
        }
        `;

        let returnVal = vm.run(fullCode, "script.js");
    });
})
