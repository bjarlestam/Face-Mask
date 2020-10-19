const webcamElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const imageElement = document.getElementById('faces');
const webcam = new Webcam(webcamElement, 'user');
let selectedMask = $(".selected-mask img");
let model = null;
let cameraFrame = null;
let detectFace = false;
let clearMask = false;
let maskOnImage = false;
let masks = [];
let maskKeyPointIndexs = [10, 234, 152, 454]; //overhead, left Cheek, chin, right cheek


$('#closeError').click(function() {
    $("#webcam-switch").prop('checked', false).change();
});

async function startFaceMask() {
    await tf.setBackend('wasm');

    return new Promise((resolve, reject) => {

        webcamElement.addEventListener('loadeddata', async (event) => {
            $(".loading").removeClass('d-none');
            try {
                model = await facemesh.load()
                $(".loading").addClass('d-none');
                if (webcam.facingMode === 'user') {
                    detectFace = true;
                }

                cameraFrame = detectFaces();
                resolve();

            } catch (err) {
                displayError('Fail to load face mesh model<br/>Please refresh the page to try again');
                reject(err);
            }
        });
    });
}

async function detectFaces() {
    let inputElement = webcamElement;
    let flipHorizontal = true;


    await model.estimateFaces(inputElement, false, flipHorizontal).then(predictions => {
        //console.log(predictions);
        drawMask(predictions);
        if(clearMask){
            clearCanvas();
            clearMask = false;
        }
        if(detectFace){
            cameraFrame = requestAnimFrame(detectFaces);
        }
    });
}

function drawMask(predictions){
    //console.log('*******');
    //console.log(predictions);
    if(masks.length !== predictions.length){
        clearCanvas();
    }   
    overheadIndex = 0;
    chinIndex = 2;
    leftCheekIndex = 3;
    rightCheekIndex = 1;
    if (predictions.length > 0) {
        for (let x = 0; x < predictions.length; x++) {
            const keypoints = predictions[x].scaledMesh;  //468 key points of face;
           
            if(masks.length > x){
                dots = masks[x].keypoints;
                maskElement = masks[x].maskElement;
            }
            else{
                dots = [];
                maskElement = $("<img src='images/draken.png' id='mask_"+x+"' class='mask' />");
                masks.push({
                    keypoints: dots,
                    maskElement: maskElement
                });
                maskElement.appendTo($("#canvas"));
            }
            for (let i = 0; i < maskKeyPointIndexs.length; i++) {
                const coordinate = getCoordinate(keypoints[maskKeyPointIndexs[i]][0], keypoints[maskKeyPointIndexs[i]][1]);
                if(dots.length > i){
                    dot = dots[i];
                }
                else{
                    dotElement = $("<div class='dot'></div>");
                    //dotElement.appendTo($("#canvas"));
                    dot = {top:0, left:0, element: dotElement};
                    dots.push(dot);
                }
                dot.left = coordinate[0];
                dot.top = coordinate[1];
                dot.element.css({top:dot.top, left:dot.left, position:'absolute'});
            }
            maskCoordinate= {top: dots[overheadIndex].top, left: dots[leftCheekIndex].left};
            maskHeight = (dots[chinIndex].top - dots[overheadIndex].top) ;
            maskWidth = (dots[rightCheekIndex].left - dots[leftCheekIndex].left) ;

            maskSizeAdjustmentWidth = 1.8;
            maskSizeAdjustmentHeight = 1.8;
            maskSizeAdjustmentTop = 0.2;
            maskSizeAdjustmentLeft = 0;
            
            maskTop = maskCoordinate.top - ((maskHeight * (maskSizeAdjustmentHeight-1))/2) - (maskHeight * maskSizeAdjustmentTop);
            maskLeft = maskCoordinate.left - ((maskWidth * (maskSizeAdjustmentWidth-1))/2) + (maskWidth * maskSizeAdjustmentLeft);

            maskElement.css({
                top: maskTop, 
                left: maskLeft,
                width: maskWidth * maskSizeAdjustmentWidth,
                height: maskHeight * maskSizeAdjustmentHeight,
                position:'absolute',
                opacity: 0.8
            });    
        }
    }
}

function getCoordinate(x,y){
    if(webcam.webcamList.length === 1 || window.innerWidth/window.innerHeight >= webcamElement.width/webcamElement.height){
        ratio = canvasElement.clientHeight/webcamElement.height;
        resizeX = x*ratio;
        resizeY = y*ratio;
        $('#message').text('ett');
    }
    else if(window.innerWidth>=1024){
        ratio = 2;
        leftAdjustment = ((webcamElement.width/webcamElement.height) * canvasElement.clientHeight - window.innerWidth) * 0.38
        resizeX = x*ratio - leftAdjustment;
        resizeY = y*ratio;
        $('#message').text('två');
    }
    else{
        ratio = 1.7;
        leftAdjustment = ((webcamElement.width/webcamElement.height) * canvasElement.clientHeight - window.innerWidth) * 0.38
        resizeX = x*ratio - leftAdjustment;
        resizeY = y*ratio;
        $('#message').text('triii');
    }

    return [resizeX, resizeY];
}

function clearCanvas(){
    $("#canvas").empty();
    masks = [];
}

function switchSource(){
    containerElement = $("#webcam-container");
    $("#button-control").addClass("d-none");
    resizeCanvas();
    $("#canvas").appendTo(containerElement);
    $(".loading").appendTo(containerElement);
    $("#mask-slider").appendTo(containerElement);
    clearCanvas();
}

$(window).resize(function() {
    resizeCanvas();
});

function main() {
    webcam.start()
        .then(result =>{
            cameraStarted();
            switchSource();
            console.log("webcam started");
            maskOnImage = false;
            startFaceMask();
        })
        .catch(err => {
            displayError();
        });
}

main();