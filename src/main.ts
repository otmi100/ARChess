import { GridHelper, Raycaster } from "three";
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
  WebGLRenderingContext,
  BoxBufferGeometry,
  MeshPhongMaterial,
  XRHitTestSource
} from "three";

import ARButton from "./ARButton";

let container;
let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;
let controller;

let reticle: Object3D;

let hitTestSource: XRHitTestSource | null = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  //

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //


  //

  const raycaster = new Raycaster();

  //

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  //

  /*const geometry = new CylinderBufferGeometry(
    0.1,
    0.1,
    0.2,
    32
  ).translate(0, 0.1, 0);*/

  // Define Chess Field
  const chessField = new GridHelper(8, 8);
  chessField.position.set(0, 0, -3);
  chessField.visible = false;
  scene.add(chessField);

  function onSelect() {
    console.log("placing chessboard");
    if (reticle.visible) {
      //const material = new MeshPhongMaterial({
      //  color: 0xffffff * Math.random(),
      //});
      //const mesh = new Mesh(geometry, material);
      //mesh.position.setFromMatrixPosition(reticle.matrix);
      //mesh.scale.y = Math.random() * 2 + 1;
      //scene.add(mesh);

      chessField.position.setFromMatrixPosition(reticle.matrix);
      chessField.scale.x = 0.1;
      chessField.scale.z = 0.1;
      chessField.rotateY(90);
      chessField.visible = true;
    }
  }
  function onSelectStart(event: any) {
    console.log(event.target);
    console.log(event.clientX);
    console.log(event.clientY);
    /*const draggableObjects = controls.getObjects();
    draggableObjects.length = 0;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    console.log(mouse.x);
    console.log(mouse.y);

    raycaster.setFromCamera(mouse, camera);

    const intersections = raycaster.intersectObjects(chessFigures, true);
    console.log(intersections);*/
  }

  function onSelectEnd() {
    console.log("not anymore");
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  reticle = new Mesh(
    new RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  //

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp: any, frame: any) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then(function (source) {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];

        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
