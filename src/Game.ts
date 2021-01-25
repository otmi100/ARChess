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
  XRSession,
} from "three";

import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import { ChessBoard } from "./ChessBoard";
import { GameMode } from "./GameMode";
import HitTest from "./HitTest";
import Userinterface from "./Userinterface";

export default class Game {
  private gameMode: GameMode = GameMode.None;

  // Workaround to access new XR features of Navigator, because Typescript definitions dont know the latest features yet and @types/webxr does not seem to be compatible to threejs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private myNav: any;

  private camera: PerspectiveCamera;
  private scene: Scene;
  private renderer: WebGLRenderer;
  private currentSession: XRSession | null = null;
  private hitTest: HitTest;

  private cameraWorldPosition = new Vector3();
  //const cameraWorldQuaternion = new Quaternion();

  private reticle: Object3D = new Mesh(
    BufferGeometryUtils.mergeBufferGeometries([
      new RingBufferGeometry(0.045, 0.05, 32).rotateX(-Math.PI / 2),
      new CircleBufferGeometry(0.005, 32).rotateX(-Math.PI / 2),
    ]),
    new MeshBasicMaterial()
  );
  private chessBoard = new ChessBoard();

  private cursor = new Vector3();
  private raycaster = new Raycaster();
  private raycastOrigin: Vector3 = new Vector3();
  private raycastDirection: Vector3 = new Vector3();

  private controller: Group;
  private ui: Userinterface;

  constructor() {
    this.myNav = navigator;
    this.onXRFrame = this.onXRFrame.bind(this);
    this.onEnterAR = this.onEnterAR.bind(this);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );
    this.scene.add(this.camera);
    const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    this.scene.add(light);

    //const axesHelper = new AxesHelper(5);
    //scene.add(axesHelper);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.ui = new Userinterface(
      this.renderer.domElement,
      this.onEnterAR,
      this.setup,
      this.placeBoard,
      () => {
        this.chessBoard.grow();
      },
      () => {
        this.chessBoard.shrink();
      },
      () => {
        this.chessBoard.rotateY();
      }
    );

    // Add hit-test & reticle
    this.hitTest = new HitTest(this.renderer);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // ToDO: needed?
    this.scene.onBeforeRender = (
      renderer: WebGLRenderer,
      scene: Scene,
      camera: Camera
    ) => {
      this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    };

    // Add touch-controler in AR
    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener("select", () => {
      if (this.gameMode === GameMode.Play) {
        this.handlePlay();
      }
    });
    this.scene.add(this.controller);

    // Add Chessboard to Scene
    this.scene.add(this.chessBoard.getBoardObject());

    window.addEventListener("resize", this.onWindowResize, false);
  }

  private setup = () => {
    if (this.gameMode === GameMode.Setup) {
      this.gameMode = GameMode.Play;
    } else {
      this.gameMode = GameMode.Setup;
    }
    this.ui.updateGameMenu(this.gameMode);
  };

  private placeBoard = () => {
    if (this.reticle.visible) {
      console.log("trying to place chessboard");
      this.chessBoard.setBoardPosition(this.reticle.matrix);
      this.ui.showNotification(
        "Use Buttons to relocate, grow, shrink or rotate Chessboard. When finished locating, use top button to deactivate Setup-Mode and start playing."
      );
    }
  };

  private onSessionEnded(): void {
    this.currentSession?.removeEventListener("end", this.onSessionEnded);
    this.currentSession = null;
    // show button again?
  }

  //Reminder: no memory allocation here please..
  private onXRFrame(timestamp: number, frame: XRFrame | undefined): void {
    if (frame) {
      if (this.gameMode === GameMode.None) {
        // Start Setup with first Frame
        this.gameMode = GameMode.Setup;
        this.ui.updateGameMenu(this.gameMode);
      }
      if (this.gameMode === GameMode.Setup) {
        const refPose = this.hitTest.getRefPose(frame);
        if (refPose) {
          this.reticle.matrix.fromArray(refPose.transform.matrix);
          this.reticle.visible = true;
        } else {
          this.reticle.visible = false;
        }
      } else if (this.gameMode === GameMode.Play) {
        this.reticle.visible = false;
        //play(controller);
      } else {
        this.reticle.visible = false;
      }
    }

    // Queue up the next frame
    if (this.currentSession) {
      this.currentSession.requestAnimationFrame(this.onXRFrame);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private async onEnterAR() {
    const overlayElement = this.ui.getOverlay();
    if (this.currentSession === null) {
      console.log("Trying to start XR Session");

      this.myNav.xr
        .requestSession("immersive-ar", {
          requiredFeatures: ["hit-test"],
          optionalFeatures: ["dom-overlay"],
          domOverlay: {
            root: overlayElement,
          },
        })
        .then((session: XRSession) => {
          if ("xr" in navigator) {
            this.myNav.xr
              .isSessionSupported("immersive-ar")
              .then((supported: boolean) => {
                if (supported) {
                  session.addEventListener("end", this.onSessionEnded);

                  this.renderer.xr.setReferenceSpaceType("local");
                  this.renderer.xr.setSession(session);

                  this.chessBoard.startGame(this.ui.getGameId());
                  this.ui.hideStartMenu();
                  console.log("start now!");

                  this.currentSession = session;
                  this.currentSession.requestAnimationFrame(this.onXRFrame);
                } else {
                  this.ui.showARNotSupported("AR NOT SUPPORTED");
                }
              })
              .catch(this.ui.showARNotSupported("AR NOT SUPPORTED"));
          }
        })
        .catch(this.ui.showARNotSupported);
    } else {
      if (window.isSecureContext === false) {
        this.ui.showARNotSupported("WEBXR NEEDS HTTPS");
      } else {
        this.ui.showARNotSupported("WEBXR NOT AVAILABLE");
      }
    }
  }

  private onWindowResize(): void {
    console.log("onWindowResize() has been called..");
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  private handlePlay(): void {
    this.cursor.set(0, 0, 0).applyMatrix4(this.controller.matrixWorld);
    this.raycastOrigin.set(
      this.cameraWorldPosition.x,
      this.cameraWorldPosition.y,
      this.cameraWorldPosition.z
    );
    this.raycastDirection
      .subVectors(this.cursor, this.raycastOrigin)
      .normalize();
    //console.log("raycast from camera"), console.log(cameraWorldPosition);
    //console.log("raycast to cursor"), console.log(cursor);
    this.raycaster.set(this.raycastOrigin, this.raycastDirection);
    const selectedPiece = this.chessBoard.getSelectedPiece();
    if (selectedPiece) {
      // move a piece
      console.log(this.chessBoard.getSelectedPiece());
      console.log("choose where to move");

      // interact with fields and selected piece
      const interactiveObjects = this.chessBoard.getAllFieldObjects();
      interactiveObjects.push(selectedPiece);

      const intersects = this.raycaster.intersectObjects(
        this.chessBoard.getAllFieldObjects(),
        true
      );

      if (intersects.length > 0) {
        if (intersects[0].object !== selectedPiece) {
          console.log("found field to move to");
          console.log(intersects[0].object.position);
          const result = this.chessBoard.moveSelectedPieceTo({
            file: intersects[0].object.position.x,
            rank: Math.abs(intersects[0].object.position.z),
          });
          this.ui.showNotification(result);
        }
        this.chessBoard.unSelectPiece();
      }
    } else {
      // Select a piece
      console.log("trying to select piece");
      console.log(this.chessBoard.getAllVisiblePieceObjects());
      const intersects = this.raycaster.intersectObjects(
        this.chessBoard.getAllVisiblePieceObjects(),
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
          const result = this.chessBoard.selectPiece(chessPiece);
          this.ui.showNotification(result);
        }
      }
    }
  }
}
