import { Color, Material, Mesh, MeshStandardMaterial, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Position } from "./ChessBoard";

type PlayingColor = "WHITE" | "BLACK";
type StartingPosition = {
  color: PlayingColor;
  position: Position[];
};

type MaterialDefinition = {
  playingColor: PlayingColor;
  selected: boolean;
  material: Material;
};

export abstract class ChessPiece {
  static materialDefinitions: MaterialDefinition[] = [
    {
      playingColor: "BLACK",
      selected: false,
      material: new MeshStandardMaterial({
        color: new Color().set(0x464646),
      }),
    },
    {
      playingColor: "BLACK",
      selected: true,
      material: new MeshStandardMaterial({
        color: new Color().set(0x823b49),
      }),
    },
    {
      playingColor: "WHITE",
      selected: false,
      material: new MeshStandardMaterial({
        color: new Color().set(0xebe7e7),
      }),
    },
    {
      playingColor: "WHITE",
      selected: true,
      material: new MeshStandardMaterial({
        color: new Color().set(0xd6b2c8),
      }),
    },
  ];

  object3D: Object3D | undefined = undefined;
  static loader = new GLTFLoader();
  abstract modelFile: string;
  private playingColor: PlayingColor;
  private position: Position | null;

  constructor(playingColor: PlayingColor, position: Position) {
    this.playingColor = playingColor;
    this.position = position;
  }

  async getObject3D(): Promise<Object3D> {
    return new Promise<Object3D>((resolve, reject) => {
      if (!this.object3D) {
        this.loadModel(this.modelFile).then((model) => {
          console.log("lazy loaded model. applying texture");

          //let object = model.getObjectByName(this.modelName);
          if (model) {
            this.object3D = model;
            this.applyMaterialForAllPieces();
            resolve(this.object3D);
          } else {
            reject("could not find model " + this.modelFile);
          }
        });
      } else {
        resolve(this.object3D);
      }
    });
  }

  getPosition(): Position | null {
    return this.position;
  }

  setPosition(position: Position | null) {
    if (position !== null && this.object3D) {
      this.object3D.position.set(position.x, 0, position.y);
      this.position = position;
    } else if (position === null && this.object3D) {
      this.object3D.visible = false;
    } else {
      console.error("cannot set position");
    }
  }

  select() {
    if (this.object3D) {
      let object = this.object3D;
      this.applyMaterial(object, true);
    } else {
      throw new Error("3D Object not loaded.");
    }
  }

  unSelect() {
    if (this.object3D) {
      let object = this.object3D;
      this.applyMaterial(object, false);
    } else {
      throw new Error("3D Object not loaded.");
    }
  }

  private applyMaterial(object: Object3D, selected: boolean) {
    let materialDefinition = ChessPiece.materialDefinitions.find(
      (materialdef) =>
        materialdef.playingColor === this.playingColor &&
        materialdef.selected === selected
    );

    object.traverse((o) => {
      if (materialDefinition && materialDefinition.material) {
        (<Mesh>o).material = materialDefinition.material;
      } else {
        throw new Error(
          "Material not found for " + this.playingColor + " and not selected"
        );
      }
    });
  }

  private loadModel(filename: string): Promise<Object3D> {
    return new Promise<Object3D>((resolve, reject) => {
      ChessPiece.loader.load(
        filename,
        function (gltf) {
          //console.log("loaded gltf");
          //console.log(gltf);
          resolve(gltf.scene);
        },
        undefined,
        function (error) {
          reject(error);
        }
      );
    });
  }

  private applyMaterialForAllPieces() {
    if (this.object3D) {
      let object = this.object3D;
      let material = Pawn.materialDefinitions.find(
        (materialdef) =>
          materialdef.playingColor === this.playingColor &&
          materialdef.selected === false
      );
      console.log(
        "applying material for loaded model " +
          typeof this +
          " " +
          this.playingColor
      );
      console.log(object);
      object.children.forEach((model) => {
        this.applyMaterial(model, false);
      });
    } else {
      throw new Error("3D Object not loaded.");
    }
  }
}

export class Pawn extends ChessPiece {
  modelFile: string = "./models/pawn/scene.gltf";
  modelName = "Chess_Pawn";

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
  modelName = "Chess_King";

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
  modelName = "Chess_Queen";

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
  modelName = "Chess_Rook";

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
  modelName = "Chess_Bishop";

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
  modelName = "Chess_Knight";

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
