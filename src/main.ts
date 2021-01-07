import {
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  WebGLRenderer,
  Object3D,
  Mesh,
  RingBufferGeometry,
  MeshBasicMaterial,
  XRHitTestSource,
  CircleBufferGeometry,
  GridHelper,
  Raycaster,
  Vector2,
  Vector3,
  Camera,
  Quaternion,
  AxesHelper,
  Group,
  CylinderBufferGeometry,
  MeshPhongMaterial,
  Intersection,
  MeshStandardMaterial,
  Color,
  Vector,
  BoxGeometry,
  ArrowHelper,
  IcosahedronBufferGeometry,
} from "three";

import ARButton from "./ARButton";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import { ChessBoard } from "./ChessBoard";

enum GameMode {
  None,
  Setup,
  Play,
}

let gameMode: GameMode = GameMode.None;

let container;
let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;

let cameraWorldPosition = new Vector3();
let cameraWorldQuaternion = new Quaternion();

let reticle: Object3D;
const chessBoard = new ChessBoard();
const chessBoardObject = chessBoard.getBoardObject();

let hitTestSource: XRHitTestSource | null = null;
let hitTestSourceRequested = false;

// GAME-MODE Buttons
const putChessboardButton = <HTMLButtonElement>(
  document.getElementById("putChessboard")
);
const playButton = <HTMLButtonElement>document.getElementById("play");

// SETUP Buttons
const okButton = <HTMLButtonElement>document.getElementById("OK");
const rotateChessboardButton = <HTMLButtonElement>(
  document.getElementById("rotate")
);
const growButton = <HTMLButtonElement>document.getElementById("grow");
const shrinkButton = <HTMLButtonElement>document.getElementById("shrink");

const cursor = new Vector3();
const raycaster = new Raycaster();
let controller: Group;

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
  scene.add(camera);

  scene.onBeforeRender = (
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    rendertarget: any
  ) => {
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
  };

  const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  const axesHelper = new AxesHelper(5);
  scene.add(axesHelper);

  //

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", () => {
    controller.userData.isSelecting = true;
    controller.userData.skipFrames = 2;
  });
  controller.addEventListener("selectend", () => {
    controller.userData.isSelecting = false;
  });
  controller.addEventListener("select", () => {
    
  });
  controller.userData.skipFrames = 0;
  scene.add(controller);

  //
  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: {
        root: document.getElementById("overlay"),
      },
    })
  );

  //
  scene.add(chessBoardObject);

  putChessboardButton?.addEventListener("click", () => {
    gameMode = GameMode.Setup;
  });
  rotateChessboardButton?.addEventListener("click", () => {
    chessBoardObject.rotateY(10);
  });
  growButton?.addEventListener("click", () => {
    chessBoardObject.scale.x *= 1.1;
    chessBoardObject.scale.y *= 1.1;
    chessBoardObject.scale.z *= 1.1;
  });
  shrinkButton?.addEventListener("click", () => {
    chessBoardObject.scale.x *= 0.9;
    chessBoardObject.scale.y *= 0.9;
    chessBoardObject.scale.z *= 0.9;
  });

  okButton?.addEventListener("click", (event) => {
    if (reticle.visible && gameMode === GameMode.Setup) {
      console.log("trying to place chessboard");

      //chessBoardObject.position.setFromMatrixPosition(reticle.matrix);
      chessBoardObject.applyMatrix4(reticle.matrix);
      chessBoardObject.visible = true;
    }
  });
  playButton.addEventListener("click", () => {
    gameMode = GameMode.Play;
  });

  let ring = new RingBufferGeometry(0.045, 0.05, 32).rotateX(-Math.PI / 2);
  let dot = new CircleBufferGeometry(0.005, 32).rotateX(-Math.PI / 2);
  reticle = new Mesh(
    BufferGeometryUtils.mergeBufferGeometries([ring, dot]),
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

let origin: Vector3 = new Vector3();
let direction: Vector3 = new Vector3();
//let hexColors = [0x483D8B, 0xcd0000, 0x227744, 0x000000, 0xFFFFFF];
function play(controller: Group) {
  const userData = controller.userData;

  cursor.set(0, 0, 0).applyMatrix4(controller.matrixWorld);

  if (userData.isSelecting === true) {
    if (userData.skipFrames >= 0) {
      userData.skipFrames--;

      origin.set(
        cameraWorldPosition.x,
        cameraWorldPosition.y,
        cameraWorldPosition.z
      );
      direction.subVectors(cursor, origin).normalize();
      //console.log("raycast from camera"), console.log(cameraWorldPosition);
      //console.log("raycast to cursor"), console.log(cursor);

      raycaster.set(origin, direction);
      /*scene.add(
    new ArrowHelper(
      raycaster.ray.direction,
      raycaster.ray.origin,
      300,
      hexColors.pop()
    )
  );*/

      if (chessBoard.getSelectedPiece()) {
        // move a piece
        console.log(chessBoard.getSelectedPiece());
        console.log("choose where to move");
        const intersects = raycaster.intersectObjects(
          chessBoard.getAllFieldObjects(),
          true
        );

        if (intersects.length > 0) {
          console.log("found field");
          console.log(intersects[0].object.position);
          chessBoard.moveSelectedPiece({
            x: intersects[0].object.position.x,
            y: intersects[0].object.position.z,
          });
          chessBoard.unSelectPiece();
        }
      } else {
        // Select a piece
        console.log("select piece");
        console.log(chessBoard.getAllVisiblePieceObjects());
        const intersects = raycaster.intersectObjects(
          chessBoard.getAllVisiblePieceObjects(),
          true
        );
        if (intersects.length > 0) {
          console.log("found piece");
          console.log(intersects[0].object.position);
          chessBoard.selectPiece(intersects[0].object);
          userData.isSelecting = false; //stop until next touch start
        }
      }

      console.log("start at");
      console.log(cursor);
    } else {
      console.log("drag to");
      console.log(cursor);
    }
  }
}

function render(timestamp: any, frame: any) {
  if (frame) {
    if (gameMode === GameMode.None) {
      chessBoardObject.visible = false;
      gameMode = GameMode.Setup;
    }
    if (gameMode === GameMode.Setup) {
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
        okButton.disabled = false;

        if (hitTestResults.length) {
          const hit = hitTestResults[0];

          reticle.visible = true;
          reticle.matrix.fromArray(
            hit.getPose(referenceSpace).transform.matrix
          );
        } else {
          reticle.visible = false;
        }
      } else {
        okButton.disabled = true;
      }
    } else if (gameMode === GameMode.Play) {
      reticle.visible = false;
      play(controller);
    } else {
      reticle.visible = false;
    }
  }

  renderer.render(scene, camera);
}
