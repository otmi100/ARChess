import { Color, Material, Mesh, MeshStandardMaterial, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Position } from "./ChessBoard";
import { Color as PlayingColor, Role } from "chessops";

type MaterialDefinition = {
  playingColor: PlayingColor;
  selected: boolean;
  material: Material;
};
type ModelDefinition = {
  role: Role;
  modelFile: string;
};

const materialDefinitions: MaterialDefinition[] = [
  {
    playingColor: "black",
    selected: false,
    material: new MeshStandardMaterial({
      color: new Color().set(0x464646),
    }),
  },
  {
    playingColor: "black",
    selected: true,
    material: new MeshStandardMaterial({
      color: new Color().set(0x823b49),
    }),
  },
  {
    playingColor: "white",
    selected: false,
    material: new MeshStandardMaterial({
      color: new Color().set(0xebe7e7),
    }),
  },
  {
    playingColor: "white",
    selected: true,
    material: new MeshStandardMaterial({
      color: new Color().set(0xd6b2c8),
    }),
  },
];

const modelDefinitions: ModelDefinition[] = [
  {
    role: "pawn",
    modelFile: "./models/pawn/scene.gltf",
  },
  {
    role: "king",
    modelFile: "./models/king/scene.gltf",
  },
  {
    role: "queen",
    modelFile: "./models/queen/scene.gltf",
  },
  {
    role: "rook",
    modelFile: "./models/rook/scene.gltf",
  },
  {
    role: "bishop",
    modelFile: "./models/bishop/scene.gltf",
  },
  {
    role: "knight",
    modelFile: "./models/knight/scene.gltf",
  },
];

export class ChessPiece {
  object3D: Object3D | undefined = undefined;
  private playingColor: PlayingColor;
  private position: Position;
  private modelFile: string;
  private role: Role;
  private updatedAfterMove = true;

  static loader = new GLTFLoader();

  constructor(playingColor: PlayingColor, role: Role, position: Position) {
    this.playingColor = playingColor;
    this.role = role;
    this.position = position;
    const modelDefinition = modelDefinitions.find(
      (element) => element.role === role
    );
    if (modelDefinition) {
      this.modelFile = modelDefinition.modelFile;
    } else {
      throw new Error("Model for role " + role + " not found!");
    }
  }

  getColor(): PlayingColor {
    return this.playingColor;
  }

  getRole(): Role {
    return this.role;
  }

  async getObject3D(): Promise<Object3D> {
    return new Promise<Object3D>((resolve, reject) => {
      if (!this.object3D) {
        this.loadModel(this.modelFile).then((model) => {
          console.log("lazy loaded model. applying texture");

          //let object = model.getObjectByName(this.modelName);
          if (model) {
            this.object3D = model;
            this.object3D.name = "PieceRoot";
            this.applyMaterial(false);
            if (this.getColor() === "white") {
              this.object3D.rotateY(3.1416);
            }
            this.object3D.position.set(
              this.position.file,
              0.35,
              -this.position.rank
            );
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

  getPosition(): Position {
    return this.position;
  }

  setPosition(position: Position): void {
    this.getObject3D().then((object3D) => {
      if (position) {
        object3D.position.set(position.file, 0.35, -position.rank);
        object3D.visible = true;
      } else {
        object3D.visible = false;
      }
      this.position = position;
    });
  }

  select(): void {
    if (this.object3D) {
      this.applyMaterial(true);
    } else {
      throw new Error("3D Object not loaded.");
    }
  }

  unSelect(): void {
    if (this.object3D) {
      this.applyMaterial(false);
    } else {
      throw new Error("3D Object not loaded.");
    }
  }

  private applyMaterial(selected: boolean) {
    const materialDefinition = materialDefinitions.find(
      (materialdef) =>
        materialdef.playingColor === this.playingColor &&
        materialdef.selected === selected
    );

    this.object3D?.traverse((o) => {
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

  public getUpdatedAfterMove(): boolean {
    return this.updatedAfterMove;
  }

  public setUpdatedAfterMove(updatedAfterMove: boolean): void {
    this.updatedAfterMove = updatedAfterMove;
  }
}
