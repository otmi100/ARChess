import { Color, Mesh, MeshStandardMaterial, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

type PlayingColor = "WHITE" | "BLACK";
type Position = {
  x: number;
  y: number;
};
type StartingPosition = {
  color: PlayingColor;
  position: Position[];
};

export class ChessPieceManager {
  static getAllStartingPieces(): ChessPiece[] {
    let pieceTypes = [Bishop, King, Knight, Pawn, Queen, Rook];
    let piece: ChessPiece[] = [];

    pieceTypes.forEach(type => {
        type.startingPositions.forEach((startingPosition) => {
          startingPosition.position.forEach((position) => {
            piece.push(new type(startingPosition.color, position));
          });
        });
    })
    return piece;
  }
}

export abstract class ChessPiece {
  static whiteNotSelected = new MeshStandardMaterial({
    color: new Color().set(0xf0cfdc),
  });
  static blackNotSelected = new MeshStandardMaterial({
    color: new Color().set(0x3a1e1e),
  });

  private object3D: Object3D | undefined = undefined;
  static loader = new GLTFLoader();
  abstract modelFile: string;
  private playingColor: PlayingColor;
  private position: Position;

  constructor(playingColor: PlayingColor, position: Position) {
    this.playingColor = playingColor;
    this.position = position;
  }

  async getObject3D(): Promise<Object3D> {
    return new Promise<Object3D>((resolve) => {
      if (!this.object3D) {
        this.loadModel(this.modelFile).then((model) => {
          console.log("lazy loaded model. applying texture");
          this.object3D = model;
          this.applyColorAndTexture();
          resolve(this.object3D);
        });
      } else {
        resolve(this.object3D);
      }
    });
  }

  getPosition(): Position {
    return this.position;
  }

  private loadModel(filename: string): Promise<Object3D> {
    return new Promise<Object3D>((resolve, reject) => {
      ChessPiece.loader.load(
        filename,
        function (gltf) {
          console.log("loaded gltf");
          console.log(gltf);
          resolve(gltf.scene);
        },
        undefined,
        function (error) {
          reject(error);
        }
      );
    });
  }

  private applyColorAndTexture() {
    if (this.object3D) {
      if (this.playingColor === "WHITE") {
        this.object3D.traverse((o) => {
          (<Mesh>o).material = Pawn.whiteNotSelected;
        });
      } else {
        this.object3D.traverse((o) => {
          (<Mesh>o).material = Pawn.blackNotSelected;
        });
      }
    } else {
      throw new Error("3D Object not loaded.");
    }
  }
}

export class Pawn extends ChessPiece {
  modelFile: string = "./models/pawn/scene.gltf";

  public static startingPositions: StartingPosition[] = [
    {
      color: "WHITE",
      position: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
        { x: 6, y: 1 },
        { x: 7, y: 1 },
      ],
    },
    {
      color: "BLACK",
      position: [
        { x: 0, y: 6 },
        { x: 1, y: 6 },
        { x: 2, y: 6 },
        { x: 3, y: 6 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 7, y: 6 },
      ],
    },
  ];
}

export class King extends ChessPiece {
  modelFile: string = "./models/king/scene.gltf";

  public static startingPositions: StartingPosition[] = [
    {
      color: "WHITE",
      position: [{ x: 4, y: 0 }],
    },
    {
      color: "BLACK",
      position: [{ x: 4, y: 7 }],
    },
  ];
}

export class Queen extends ChessPiece {
  modelFile: string = "./models/queen/scene.gltf";

  public static startingPositions: StartingPosition[] = [
    {
      color: "WHITE",
      position: [{ x: 3, y: 0 }],
    },
    {
      color: "BLACK",
      position: [{ x: 3, y: 7 }],
    },
  ];
}

export class Rook extends ChessPiece {
  modelFile: string = "./models/rook/scene.gltf";

  public static startingPositions: StartingPosition[] = [
    {
      color: "WHITE",
      position: [
        { x: 0, y: 0 },
        { x: 7, y: 0 },
      ],
    },
    {
      color: "BLACK",
      position: [
        { x: 0, y: 7 },
        { x: 7, y: 7 },
      ],
    },
  ];
}

export class Bishop extends ChessPiece {
  modelFile: string = "./models/bishop/scene.gltf";

  public static startingPositions: StartingPosition[] = [
    {
      color: "WHITE",
      position: [
        { x: 2, y: 0 },
        { x: 5, y: 0 },
      ],
    },
    {
      color: "BLACK",
      position: [
        { x: 2, y: 7 },
        { x: 5, y: 7 },
      ],
    },
  ];
}

export class Knight extends ChessPiece {
  modelFile: string = "./models/knight/scene.gltf";

  public static startingPositions: StartingPosition[] = [
    {
      color: "WHITE",
      position: [
        { x: 1, y: 0 },
        { x: 6, y: 0 },
      ],
    },
    {
      color: "BLACK",
      position: [
        { x: 1, y: 7 },
        { x: 6, y: 7 },
      ],
    },
  ];
}
