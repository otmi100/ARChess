import {
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  WebGLRenderer,
  Object3D,
  Mesh,
  RingBufferGeometry,
  MeshBasicMaterial,
  CircleBufferGeometry,
  Raycaster,
  Vector3,
  Camera,
  Group,
  XRFrame,
} from "three";

import ARButton from "./ARButton";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import { ChessBoard } from "./ChessBoard";
import HitTest from "./HitTest";

enum GameMode {
  None,
  Setup,
  Play,
}

let gameMode: GameMode = GameMode.None;

let container;
let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;
let hitTest: HitTest;

const cameraWorldPosition = new Vector3();
//const cameraWorldQuaternion = new Quaternion();

let reticle: Object3D;
const chessBoard = new ChessBoard();

// GAME-MODE Buttons
const setupButton = <HTMLButtonElement>document.getElementById("setup");

// SETUP Buttons
const placeButton = <HTMLButtonElement>document.getElementById("place");
const rotateChessboardButton = <HTMLButtonElement>(
  document.getElementById("rotate")
);
const growButton = <HTMLButtonElement>document.getElementById("grow");
const shrinkButton = <HTMLButtonElement>document.getElementById("shrink");

const notificationText = document.getElementById("notificationText");
const setupMenu = document.getElementById("setupMenu");

const gameIdInput = <HTMLInputElement>document.getElementById("gameid");
const startGameButton = <HTMLButtonElement>document.getElementById("startGame");
const startDiv = document.getElementById("startDiv");


// Game Overlay
const overlayElement = document.getElementById("overlay");

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
    camera: Camera
  ) => {
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
  };

  const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  //const axesHelper = new AxesHelper(5);
  //scene.add(axesHelper);

  //

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  hitTest = new HitTest(renderer);

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
  if (startGameButton && overlayElement) {
    new ARButton(
      startGameButton,
      () => {
        if(gameIdInput) {
          chessBoard.startGame(+gameIdInput.value);
          console.log("start now!");
        }
      },
      renderer,
      {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
          root: overlayElement,
        },
      }
    );
  } else {
    throw new Error("Overlay DOM Element not found.");
  }

  //
  scene.add(chessBoard.getBoardObject());

  setupButton?.addEventListener("click", () => {
    toogleMenu();
  });
  placeButton?.addEventListener("click", () => {
    if (reticle.visible) {
      console.log("trying to place chessboard");
      if (notificationText) {
        notificationText.innerText =
          "Use Buttons to relocate, grow, shrink or rotate Chessboard. When finished locating, use top button to deactivate Setup-Mode and start playing.";
      }
      chessBoard.setBoardPosition(reticle.matrix);
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

  const ring = new RingBufferGeometry(0.045, 0.05, 32).rotateX(-Math.PI / 2);
  const dot = new CircleBufferGeometry(0.005, 32).rotateX(-Math.PI / 2);
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

const origin: Vector3 = new Vector3();
const direction: Vector3 = new Vector3();

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
  const selectedPiece = chessBoard.getSelectedPiece();
  if (selectedPiece) {
    // move a piece
    console.log(chessBoard.getSelectedPiece());
    console.log("choose where to move");

    // interact with fields and selected piece
    const interactiveObjects = chessBoard.getAllFieldObjects();
    interactiveObjects.push(selectedPiece);

    const intersects = raycaster.intersectObjects(
      chessBoard.getAllFieldObjects(),
      true
    );

    if (intersects.length > 0) {
      if (intersects[0].object !== selectedPiece) {
        console.log("found field to move to");
        console.log(intersects[0].object.position);
        const result = chessBoard.moveSelectedPieceTo({
          file: intersects[0].object.position.x,
          rank: Math.abs(intersects[0].object.position.z),
        });
        showResult(result);
      }
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
        const result = chessBoard.selectPiece(chessPiece);
        showResult(result);
      }
    }
  }
}

function render(timestamp: number, frame: XRFrame | undefined) {
  if (frame) {
    if (gameMode === GameMode.None) {
      toogleMenu();
    }
    if (gameMode === GameMode.Setup) {
      const refPose = hitTest.getRefPose(frame);
      if (refPose) {
        reticle.matrix.fromArray(refPose.transform.matrix);
        reticle.visible = true;
      } else {
        reticle.visible = false;
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

const toogleMenu = () => {
  if (gameMode === GameMode.Setup) {
    gameMode = GameMode.Play;
    setupButton.classList.remove("btnpressed");
    if (notificationText && setupMenu) {
      notificationText.innerText = "";
      notificationText.style.visibility = "hidden";
      setupMenu.style.visibility = "hidden";
      console.log("trying to hide");
    }
  } else {
    gameMode = GameMode.Setup;
    if (notificationText && setupMenu) {
      notificationText.innerText =
        'Move the camera slowly around until you see a white circle. Hit "place" to place Chessboard.';
      notificationText.style.visibility = "visible";
      setupMenu.style.visibility = "visible";
    }
    setupButton.classList.add("btnpressed");
  }
  setupButton.style.visibility = "visible";
  startGameButton.style.visibility = "hidden";
  gameIdInput.style.visibility = "hidden";
  if(startDiv) {
    startDiv.style.visibility = "hidden";
  }
};

const showResult = (result: string | undefined) => {
  if (result) {
    if (result && notificationText) {
      notificationText.innerText = result;
      notificationText.style.visibility = "visible";
    }
  } else {
    if (notificationText) {
      notificationText.style.visibility = "hidden";
    }
  }
};
