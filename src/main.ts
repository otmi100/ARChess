import {
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  WebGLRenderer,
  Object3D,
  XRSession,
  CylinderBufferGeometry,
  Mesh,
  RingBufferGeometry,
  MeshBasicMaterial,
  XRWebGLLayer,
  WebGLRenderingContext as ThreeWebGLRenderingContext,
} from "three";

//import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// global scene values
let btn: HTMLButtonElement;
let gl: any;
let glCanvas;
let camera: PerspectiveCamera;
let scene: Scene;
let renderer: WebGLRenderer;
let controller, reticle: Object3D;

// global xr value
let xrSession: XRSession;
let xrViewerPose;
let hitTestSource: null = null;
let hitTestSourceRequested = false;

let myNav: any;
myNav = navigator;


loadScene();
init();

function loadScene() {
    // setup WebGL
    glCanvas = document.createElement('canvas');
    gl = glCanvas.getContext('webgl', { antialias: true });
    
    // setup js scene
    camera = new PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        1000
    );

    scene = new Scene();

    var light = new HemisphereLight( 0xffffff, 0xbbbbff, 1 );
				light.position.set( 0.5, 1, 0.25 );
                scene.add( light );

    var geometry = new BoxBufferGeometry(0.2, 0.2, 0.2);
    var material = new MeshPhongMaterial({color: 0x89CFF0});
    cube = new Mesh( geometry, material );
    cube.position.y = 0.2;
    scene.add( cube );

    // setup js WebGL renderer
    renderer = new WebGLRenderer({
        canvas: glCanvas,
        context: gl
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    document.body.appendChild( renderer.domElement );
}

function init() {
        navigator.xr.isSessionSupported('immersive-ar')
            .then((supported) => {
                if (supported) {
                    btn = document.createElement("button");
                    btn.addEventListener('click', onRequestSession);
                    btn.innerHTML = "Enter XR";
                    var header = document.querySelector("header");
                    header.appendChild(btn);
                }
                else {
                    navigator.xr.isSessionSupported('inline')
                        .then((supported) => {
                            if (supported) {
                                console.log('inline session supported')
                            }
                            else {console.log('inline not supported')};
                        })
                }
            })
            .catch((reason) => {
                console.log('WebXR not supported: ' + reason);
            });
}

function onRequestSession() {
    console.log("requesting session");
    navigator.xr.requestSession('immersive-ar', {requiredFeatures: ['viewer', 'local']})
        .then(onSessionStarted)
        .catch((reason) => {
            console.log('request disabled: ' + reason);
        });
}

function onSessionStarted(session) {
    console.log('starting session');
    btn.removeEventListener('click', onRequestSession);
    btn.addEventListener('click', endXRSession);
    btn.innerHTML = "STOP AR";
    xrSession = session;
    xrSession.addEventListener("end", onSessionEnd);
    setupWebGLLayer()
        .then(()=> {
            renderer.xr.setReferenceSpaceType('local');
            renderer.xr.setSession(xrSession);
            animate();
        })
}

function setupWebGLLayer() {
    return gl.makeXRCompatible().then(() => {
        xrSession.updateRenderState( {baseLayer: new XRWebGLLayer(xrSession, gl) });
    });
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(time) {
    if (!xrSession) {
        renderer.clear(true, true, true);
        return;
    } else {
        time *= 0.001;
        cube.translateY(0.2 * Math.sin(time) / 100);
        cube.rotateY(Math.PI / 180);
        renderer.render(scene, camera);
        //renderer.render(scene, camera);
    }
}

function endXRSession() {
    if (xrSession) {
        console.log('ending session...');
        xrSession.end().then(onSessionEnd);
    }
}

function onSessionEnd() {
    xrSession = null;
    console.log('session ended');
    btn.innerHTML = "START AR";
    btn.removeEventListener('click', endXRSession);
    btn.addEventListener('click', onRequestSession);
}