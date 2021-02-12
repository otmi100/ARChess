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
  XRPose,
  Quaternion,
  LineBasicMaterial,
  BufferGeometry,
  Line,
  BoxGeometry,
  Matrix4,
  AxesHelper,
} from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import { ChessBoard } from "./ChessBoard";
import { GameMode } from "./GameMode";
import HitTest from "./HitTest";
import Userinterface from "./Userinterface";

export default class Main {
  private gameMode: GameMode = GameMode.None;

  // Workaround to access new XR features of Navigator, because Typescript definitions dont know the latest features yet and @types/webxr does not seem to be compatible to threejs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private myNav: any;

  private camera: PerspectiveCamera;
  private scene: Scene;
  private renderer: WebGLRenderer;
  private currentSession: XRSession | null = null;
  private hitTest: HitTest;
  private refPose: XRPose | undefined;

  private cameraWorldPosition = new Vector3();
  //const cameraWorldQuaternion = new Quaternion();

  private reticle: Object3D = new Mesh(
    BufferGeometryUtils.mergeBufferGeometries([
      new RingBufferGeometry(0.045, 0.05, 32).rotateX(-Math.PI / 2),
      new CircleBufferGeometry(0.005, 32).rotateX(-Math.PI / 2),
    ]),
    new MeshBasicMaterial()
  );
  private chessBoard: ChessBoard | undefined;

  private cursor = new Vector3();
  private raycaster = new Raycaster();
  private raycastDirection: Vector3 = new Vector3();

  private controller: Group;
  private ui: Userinterface;

  constructor() {
    this.myNav = navigator;
    this.onXRFrame = this.onXRFrame.bind(this);
    this.onEnterAR = this.onEnterAR.bind(this);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    this.scene.add(this.camera);
    const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    this.scene.add(light);

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
        const chessBoardObject = this.chessBoard?.getBoardObject();
        if (chessBoardObject) {
          chessBoardObject.scale.x *= 1.1;
          chessBoardObject.scale.y *= 1.1;
          chessBoardObject.scale.z *= 1.1;
        }
      },
      () => {
        const chessBoardObject = this.chessBoard?.getBoardObject();
        if (chessBoardObject) {
          chessBoardObject.scale.x *= 0.9;
          chessBoardObject.scale.y *= 0.9;
          chessBoardObject.scale.z *= 0.9;
        }
      },
      () => {
        this.chessBoard?.getBoardObject().rotateY(0.1);
      }
    );

    if (this.ui.isVisualDebug()) {
      const axesHelper = new AxesHelper(5);
      this.scene.add(axesHelper);
    }

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
    if (this.reticle.visible && this.chessBoard) {
      console.log("trying to place chessboard");
      //this.chessBoard.setBoardPosition(this.reticle.matrix);
      if (this.refPose) {
        const reference = this.refPose.transform;

        console.log("trying to set board to reference position");
        console.log(reference);
        this.chessBoard
          .getBoardObject()
          .position.set(
            reference.position.x,
            reference.position.y,
            reference.position.z
          );
        this.chessBoard
          .getBoardObject()
          .setRotationFromQuaternion(
            new Quaternion(
              reference.orientation.x,
              reference.orientation.y,
              reference.orientation.z,
              reference.orientation.w
            )
          );
        this.chessBoard.getBoardObject().visible = true;
      } else {
        console.error("no reference pose");
      }
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
          this.refPose = refPose;
          this.reticle.visible = true;
        } else {
          this.reticle.visible = false;
          this.refPose = undefined;
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
    if (this.ui.getGameId()) {
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

                    this.chessBoard = new ChessBoard(this.ui.getGameId());
                    // Add Chessboard to Scene
                    this.chessBoard
                      .getBoardObject()
                      .scale.set(0.05, 0.05, 0.05);
                    this.chessBoard.getBoardObject().visible = false;
                    this.scene.add(this.chessBoard.getBoardObject());
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
    } else {
      this.ui.showNotification("Please enter GameID");
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
    if (this.chessBoard) {
      this.cursor.set(0, 0, 0).applyMatrix4(this.controller.matrixWorld);
      this.raycastDirection
        .subVectors(this.cursor, this.cameraWorldPosition)
        .normalize();
      this.raycaster.set(this.cameraWorldPosition, this.raycastDirection);

      if (this.ui.isVisualDebug()) {
        this.drawLineInDirection(
          this.cameraWorldPosition,
          this.raycastDirection
        );
        this.drawCube(this.controller.matrixWorld, 0x00ff00);
      }

      if (this.chessBoard.getSelectedPiece()) {
        // player wants to move a selected piece
        this.selectWhereToMovePiece();
      } else {
        // no piece selected. select a piece
        this.selectPieceToMove();
      }
    } else {
      throw new Error("Game not started yet.");
    }
  }

  private selectPieceToMove(): void {
    if (this.chessBoard) {
      // Select a piece
      console.log("trying to select piece");
      console.log(this.chessBoard.getAllVisiblePieceObjects());

      const intersects = this.raycaster.intersectObjects(
        this.chessBoard.getAllVisiblePieceObjects(),
        true
      );

      console.log(intersects);
      if (intersects.length > 0) {
        console.log("found intersecting objects");
        console.log(intersects);
        let chessPiece: Object3D | null | undefined;
        for (let i = 0; i < intersects.length && !chessPiece; i++) {
          chessPiece = this.walkObjectGraphToPieceRoot(intersects[i].object);
        }
        if (chessPiece) {
          console.log("found chess piece to select");
          console.log(chessPiece.position);
          const result = this.chessBoard.selectPiece(chessPiece);
          this.ui.showNotification(result);
        }
      } else {
        console.log("no intersections found..");
      }
    }
  }

  private selectWhereToMovePiece(): void {
    if (this.chessBoard) {
      console.log("select where to move the following piece");
      console.log(this.chessBoard.getSelectedPiece());

      const intersects = this.raycaster.intersectObjects(
        this.chessBoard.getAllFieldObjects(),
        true
      );

      if (intersects.length > 0) {
        if (intersects[0].object !== this.chessBoard.getSelectedPiece()) {
          console.log("found field to move to");
          console.log(intersects[0].object.position);
          this.chessBoard
            .moveSelectedPieceTo({
              file: intersects[0].object.position.x,
              rank: Math.abs(intersects[0].object.position.z),
            })
            .then((result) => {
              this.ui.showNotification(result);
            });
        }
        this.chessBoard.unSelectPiece();
      }
    }
  }

  private walkObjectGraphToPieceRoot(object: Object3D): Object3D | undefined {
    while (object.parent) {
      if (object.name === "PieceRoot") {
        return object;
      } else {
        object = object.parent;
      }
    }
    console.log(
      "went to root of object and couldnt find root-piece to select."
    );
    return undefined;
  }

  // Visual Debug Methods
  private drawLine(point1: Vector3, point2: Vector3) {
    const lineMaterial = new LineBasicMaterial({ color: 0x0000ff });
    const geometry = new BufferGeometry().setFromPoints([point1, point2]);
    const line = new Line(geometry, lineMaterial);
    this.scene.add(line);
  }

  private drawLineInDirection(start: Vector3, direction: Vector3) {
    direction.normalize();

    const distance = 100; // at what distance to determine pointB
    const pointB = new Vector3();
    pointB.addVectors(start, direction.multiplyScalar(distance));

    this.drawLine(start, pointB);
  }

  private drawCube(matrix: Matrix4, cubeColor: number) {
    const geometry = new BoxGeometry(0.001, 0.001, 0.001);
    const material = new MeshBasicMaterial({ color: cubeColor });
    const cube = new Mesh(geometry, material);
    cube.position.setFromMatrixPosition(matrix);
    this.scene.add(cube);
  }
}
new Main();
