"use strict";
exports.__esModule = true;
var three_1 = require("three");
var THREEx = require("threex");
var scene = new three_1["default"].Scene();
var ambientLight = new three_1["default"].AmbientLight(0xcccccc, 0.5);
scene.add(ambientLight);
var camera = new three_1["default"].Camera();
scene.add(camera);
var renderer = new three_1["default"].WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setClearColor(new three_1["default"].Color("lightgrey"), 0);
renderer.setSize(640, 480);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = "0px";
renderer.domElement.style.left = "0px";
document.body.appendChild(renderer.domElement);
var clock = new three_1["default"].Clock();
var deltaTime = 0;
var totalTime = 0;
////////////////////////////////////////////////////////////
// setup arToolkitSource
////////////////////////////////////////////////////////////
var arToolkitSource = new THREEx.ArToolkitSource({
    sourceType: "webcam"
});
var arToolkitContext;
function onResize() {
    arToolkitSource.onResize();
    arToolkitSource.copySizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) {
        arToolkitSource.copySizeTo(arToolkitContext.arController.canvas);
    }
}
arToolkitSource.init(function onReady() {
    onResize();
});
// handle resize event
window.addEventListener("resize", function () {
    onResize();
});
////////////////////////////////////////////////////////////
// setup arToolkitContext
////////////////////////////////////////////////////////////
// create atToolkitContext
arToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: "data/camera_para.dat",
    detectionMode: "mono"
});
// copy projection matrix to camera when initialization complete
arToolkitContext.init(function onCompleted() {
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
});
////////////////////////////////////////////////////////////
// setup markerRoots
////////////////////////////////////////////////////////////
// build markerControls
var markerRoot1 = new three_1["default"].Group();
scene.add(markerRoot1);
var markerControls1 = new THREEx.ArMarkerControls(arToolkitContext, markerRoot1, {
    type: "pattern",
    patternUrl: "data/hiro.patt"
});
var geometry1 = new three_1["default"].BoxGeometry(1, 1, 1);
var material1 = new three_1["default"].MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
    side: three_1["default"].DoubleSide
});
var mesh1 = new three_1["default"].Mesh(geometry1, material1);
mesh1.position.y = 0.5;
markerRoot1.add(mesh1);
