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
} from "three";

import ARButton from "./ARButton";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import { ChessPiece, ChessPieceManager } from "./ChessPieces";

enum GameMode {
  None,
  Setup,
  Play,
}

let gameMode: GameMode = GameMode.None;
let selectedElement: Object3D | null;

let container;
let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;

let cameraWorldPosition = new Vector3();
let cameraWorldQuaternion = new Quaternion();

let reticle: Object3D;
const chessBoard = new Group();

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

const whiteSelected = new MeshStandardMaterial({
  color: new Color().set(0xb40f52),
});
const whiteNotSelected = new MeshStandardMaterial({
  color: new Color().set(0xf0cfdc),
});

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
    // currently not needed
    // cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
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

  //

  //

  function onSelectStart() {
    controller.userData.isSelecting = true;
    controller.userData.skipFrames = 2;
  }

  function onSelectEnd() {
    controller.userData.isSelecting = false;
  }

  let cursor2 = new Vector3();
  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);
  controller.addEventListener("select", () => {
    /*
    cursor2.set(0, 0, -0.2).applyMatrix4(controller.matrixWorld);
    console.log(cursor2);

    let cameraPos = new Vector3();
    cameraPos.setFromMatrixPosition(camera.matrixWorld);
    //raycaster.setFromCamera(cursor2, camera);
    raycaster.set(cameraPos,cursor2);
    const intersects = raycaster.intersectObjects(chessFigures, true);
    console.log("Sending ray into direction");
    console.log(raycaster.ray.direction);
    console.log("Sending ray from origin");
    console.log(raycaster.ray.origin);
    let arrow = new ArrowHelper(raycaster.ray.direction, raycaster.ray.origin, 300, 0xff0000); 
    scene.add(arrow);
    console.log(arrow);

    console.log(intersects);
    if (intersects.length > 0) {
      if (intersects[0].object == selectedElement) {
        console.log("unselect object");
        (<Mesh>intersects[0].object).material = whiteNotSelected;
        selectedElement = null;
      } else {
        console.log("select object");
        selectedElement = intersects[0].object;
        (<Mesh>intersects[0].object).material = whiteSelected;
      }
    }*/
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

  const geometry = new CylinderBufferGeometry(0.1, 0.1, 0.2, 32).translate(
    0,
    0.1,
    0
  );

  type ChessBoardField = {
    field: Object3D;
    placedPiece: Object3D | null;
  };

  const chessBoardFields: ChessBoardField[][] = [];
  for (let x = 0; x < 8; x++) {
    let boardRow: ChessBoardField[] = [];
    for (let y = 0; y < 8; y++) {
      const geometry = new BoxGeometry(1, 0.01, 1);
      let fieldColor;
      let rest = (x + y) % 2;
      if (rest === 1) {
        fieldColor = 0xf5f5dc;
      } else {
        fieldColor = 0x463f31;
      }
      const material = new MeshStandardMaterial({
        color: fieldColor,
        opacity: 0.7,
      });
      const cube = new Mesh(geometry, material);
      chessBoard.add(cube);
      boardRow.push({ field: cube, placedPiece: null });
      cube.position.set(x, 0, y);
    }
    chessBoardFields.push(boardRow);
  }
  chessBoard.scale.set(0.1, 0.1, 0.1);

  const chessPieces = ChessPieceManager.getAllStartingPieces();
  chessPieces.forEach((piece: ChessPiece) => {
    piece.getObject3D().then((object) => {
      console.log(object);
      object.position.set(
        chessBoardFields[piece.getPosition().x][piece.getPosition().y].field
          .position.x,
        chessBoardFields[piece.getPosition().x][piece.getPosition().y].field
          .position.y,
        chessBoardFields[piece.getPosition().x][piece.getPosition().y].field
          .position.z
      );
      object.scale.set(0.1, 0.1, 0.1);
      chessBoard.add(object);
    });
  });
  scene.add(chessBoard);

  putChessboardButton?.addEventListener("click", () => {
    gameMode = GameMode.Setup;
  });
  rotateChessboardButton?.addEventListener("click", () => {
    selectedElement?.rotateY(10);
  });
  growButton?.addEventListener("click", () => {
    chessBoard.scale.x *= 1.1;
    chessBoard.scale.y *= 1.1;
    chessBoard.scale.z *= 1.1;
  });
  shrinkButton?.addEventListener("click", () => {
    chessBoard.scale.x *= 0.9;
    chessBoard.scale.y *= 0.9;
    chessBoard.scale.z *= 0.9;
  });

  okButton?.addEventListener("click", (event) => {
    if (reticle.visible && gameMode === GameMode.Setup) {
      console.log("trying to place chessboard");

      chessBoard.position.setFromMatrixPosition(reticle.matrix);
      chessBoard.visible = true;
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

function handleController(controller: Group) {
  const userData = controller.userData;

  cursor.set(0, 0, -0.2).applyMatrix4(controller.matrixWorld);

  if (userData.isSelecting === true) {
    if (userData.skipFrames >= 0) {
      userData.skipFrames--;

      raycaster.setFromCamera(cursor, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      scene.add(
        new ArrowHelper(
          raycaster.ray.direction,
          raycaster.ray.origin,
          300,
          0xff0000
        )
      );

      if (intersects.length > 0) {
        if (intersects[0].object == selectedElement) {
          console.log("unselect object");
          (<Mesh>intersects[0].object).material = whiteNotSelected;
          selectedElement = null;
        } else {
          console.log("select object");
          selectedElement = intersects[0].object;
          (<Mesh>intersects[0].object).material = whiteSelected;
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
      chessBoard.visible = false;
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
      handleController(controller);
    } else {
      reticle.visible = false;
    }
  }

  renderer.render(scene, camera);
}
