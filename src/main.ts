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
  Raycaster,
  Vector3,
  Camera,
  Quaternion,
  AxesHelper,
  Group,
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

let hitTestSource: XRHitTestSource | null = null;
let hitTestSourceRequested = false;

// GAME-MODE Buttons
const setupButton = <HTMLButtonElement>document.getElementById("setup");

// SETUP Buttons
const placeButton = <HTMLButtonElement>document.getElementById("place");
const rotateChessboardButton = <HTMLButtonElement>(
  document.getElementById("rotate")
);
const growButton = <HTMLButtonElement>document.getElementById("grow");
const shrinkButton = <HTMLButtonElement>document.getElementById("shrink");

const setupHelptext = document.getElementById("setupHelptext");
const setupMenu = document.getElementById("setup-menu");

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
  controller.addEventListener("select", () => {
    switch (gameMode) {
      case GameMode.Play: {
        handlePlay();
        break;
      }
      case GameMode.Setup: {
        //handleSetupClick();
        break;
      }
    }
  });
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
  scene.add(chessBoard.getBoardObject());

  setupButton?.addEventListener("click", () => {
    toogleMenu();
  });
  placeButton?.addEventListener("click", () => {
    if (reticle.visible) {
      console.log("trying to place chessboard");
      chessBoard.place(reticle.matrix);
    }
  });
  rotateChessboardButton?.addEventListener("click", () => {
    chessBoard.rotateY();
  });
  growButton?.addEventListener("click", () => {
    chessBoard.grow();
  });
  shrinkButton?.addEventListener("click", () => {
    chessBoard.shrink();
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

function handlePlay() {
  cursor.set(0, 0, 0).applyMatrix4(controller.matrixWorld);
  origin.set(
    cameraWorldPosition.x,
    cameraWorldPosition.y,
    cameraWorldPosition.z
  );
  direction.subVectors(cursor, origin).normalize();
  //console.log("raycast from camera"), console.log(cameraWorldPosition);
  //console.log("raycast to cursor"), console.log(cursor);
  raycaster.set(origin, direction);

  if (chessBoard.getSelectedPiece()) {
    // move a piece
    console.log(chessBoard.getSelectedPiece());
    console.log("choose where to move");
    const intersects = raycaster.intersectObjects(
      chessBoard.getAllFieldObjects(),
      true
    );

    if (intersects.length > 0) {
      console.log("found field to move to");
      console.log(intersects[0].object.position);
      chessBoard.moveSelectedPieceTo({
        file: intersects[0].object.position.x,
        rank: intersects[0].object.position.z,
      });
      chessBoard.unSelectPiece();
    }
  } else {
    // Select a piece
    console.log("trying to select piece");
    console.log(chessBoard.getAllVisiblePieceObjects());
    const intersects = raycaster.intersectObjects(
      chessBoard.getAllVisiblePieceObjects(),
      true
    );
    if (intersects.length > 0) {
      console.log(intersects);
      console.log("found intersecting objects");
      let nearestObject = intersects[0].object;
      let chessPiece: Object3D | null | undefined;
      while (chessPiece === undefined) {
        if (
          nearestObject.parent &&
          nearestObject.parent.name === "ChessBoard"
        ) {
          chessPiece = nearestObject;
        } else {
          if (nearestObject.parent) {
            nearestObject = nearestObject.parent;
          } else {
            chessPiece = null;
            console.log("no chess piece found to select");
          }
        }
      }
      if (chessPiece) {
        console.log("found chess piece to select");
        console.log(chessPiece.position);
        chessBoard.selectPiece(chessPiece);
      }
    }
  }
}

let origin: Vector3 = new Vector3();
let direction: Vector3 = new Vector3();
//let hexColors = [0x483D8B, 0xcd0000, 0x227744, 0x000000, 0xFFFFFF];

function render(timestamp: any, frame: any) {
  if (frame) {
    if (gameMode === GameMode.None) {
      toogleMenu();
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

        if (hitTestResults.length) {
          const hit = hitTestResults[0];

          reticle.visible = true;
          reticle.matrix.fromArray(
            hit.getPose(referenceSpace).transform.matrix
          );
        } else {
          reticle.visible = false;
        }
      }
    } else if (gameMode === GameMode.Play) {
      reticle.visible = false;
      //play(controller);
    } else {
      reticle.visible = false;
    }
  }

  renderer.render(scene, camera);
}

let toogleMenu = () => {
  if (gameMode === GameMode.Setup) {
    gameMode = GameMode.Play;
    setupButton.classList.remove("btnpressed");
    if (setupHelptext && setupMenu) {
      setupHelptext.style.visibility = "hidden";
      setupMenu.style.visibility = "hidden";
      console.log("trying to hide");
    }
  } else {
    gameMode = GameMode.Setup;
    if (setupHelptext && setupMenu) {
      setupHelptext.style.visibility = "visible";
      setupMenu.style.visibility = "visible";
    }
    setupButton.classList.add("btnpressed");
  }
};
