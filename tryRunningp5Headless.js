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

function saveCanvasImage(canvas){
    try{
        let image = canvas.toDataURL();
        images.push(image);
        console.log(image);
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
        "_saveCanvas": saveCanvasImage,
        numFrames: 3, //eventually, framerate * duration
        localStorage: {
            setItem: ()=>{}, //mock so that accessing won't error
            removeItem: ()=>{},
        },
    }
});


//fs.readFile('./p5.min.js', 'utf8' , (err, p5Code) => {
fs.readFile('./p5.js', 'utf8' , (err, p5Code) => {
    if (err) {
        console.error(err)
        return
    }

    const fullCode = drawCode + 
`
    if(draw){window.draw = draw;} //needed for p5 to detect them
    if(setup){window.setup = setup;}
`  + 
    p5Code + 
`
    let originalSetup = setup //hook to make background() and line() available in global context
    let canvas = null;
    window.setup = function(){
        for(var addedP5Func in window){  //make p5-registered functions like window.background available as "background()"
         global[addedP5Func] = window[addedP5Func]
        }
        canvas = this.canvas; //grab canvas
        originalSetup();

        noLoop();
    }
    let originalDraw = draw;
    window.draw = function(){ //will run once thanks to
        for(let i=0;i<numFrames;i++){
                originalDraw();
                //todo: hook millis()
                _saveCanvas(canvas);
        }
    }
  `;

  let returnVal = vm.run(fullCode, "script.js");
})
