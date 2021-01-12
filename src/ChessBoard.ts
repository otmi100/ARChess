import {
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { ChessPiece } from "./ChessPiece";
import { Chess } from "chessops/chess";
import { Color as PlayingColor, Role, Square } from "chessops";

type ChessBoardField = {
  object3D: Object3D;
  isOption?: boolean;
  placedPiece: ChessPiece | null;
};

export type Position = {
  rank: number;
  file: number;
};

class PieceMap {
  private chessPieces: ChessPiece[] = [];
  private chessBoardObject3D: Object3D;

  constructor(chessBoard: Object3D) {
    this.chessBoardObject3D = chessBoard;
  }

  getPieces(): ChessPiece[] {
    return this.chessPieces;
  }

  reset() {
    this.chessPieces.forEach((piece) =>
      piece.setPosition({ file: 0, rank: 0 })
    );
  }

  setUnpositioned(
    role: Role,
    color: PlayingColor,
    position: Position
  ): ChessPiece {
    const piece = this.chessPieces.find(
      (chessPiece) =>
        chessPiece.getRole() === role &&
        chessPiece.getColor() === color &&
        chessPiece.getPosition() === undefined
    );
    if (piece) {
      return piece;
    } else {
      const newPiece = new ChessPiece(color, role, position);
      newPiece.getObject3D().then((object3D) => {
        //console.log("adding object to board");
        this.chessBoardObject3D.add(object3D);
        object3D.scale.set(0.25, 0.25, 0.25);
        //console.log(this.chessBoardObject3D);
        //console.log(object3D);
      });
      this.chessPieces.push(newPiece);
      return newPiece;
    }
  }
}

export class ChessBoard {
  private chessBoardFields: Map<number, ChessBoardField> = new Map<
    number,
    ChessBoardField
  >();

  private chessBoardObject3D: Group = new Group();
  private selectedPiece: ChessPiece | undefined;
  private chessOps = Chess.default();
  private pieceMap = new PieceMap(this.chessBoardObject3D);

  constructor() {
    this.chessBoardObject3D.name = "ChessBoard";
    this.generateFields();
    this.readBoardAndPositionPieces();
    this.chessBoardObject3D.scale.set(0.05, 0.05, 0.05);
    this.chessBoardObject3D.visible = false;
  }

  getAllVisiblePieceObjects(): Object3D[] {
    const visiblePieces: Object3D[] = [];
    //console.log("looking for pieces");
    const loadedPieceObject3Ds = this.pieceMap.getPieces();
    for (let i = 0; i < loadedPieceObject3Ds.length; i++) {
      const loadedPiece = loadedPieceObject3Ds[i].object3D;
      if (loadedPiece && loadedPiece.visible === true) {
        visiblePieces.push(loadedPiece);
      } else {
        //console.log("piece has no position and should not be returned");
      }
    }
    //console.log(visiblePieces);
    return visiblePieces;
  }

  getAllFieldObjects(): Object3D[] {
    const fieldObjects: Object3D[] = [];
    this.chessBoardFields.forEach((field) => {
      fieldObjects.push(field.object3D);
    });
    return fieldObjects;
  }

  getBoardObject(): Group {
    return this.chessBoardObject3D;
  }

  private highlightMoveOptions(square: Square) {
    console.log("getting move options");
    for (const option of this.chessOps.dests(square)) {
      console.log(option);
      const field = this.chessBoardFields.get(option);
      if (field) {
        console.log("found field, marking as option");
        field.isOption = true;
        console.log(field);
      }
      //console.log((square >> 3) + " x " + (square & 7));
    }
    this.updateFields();
  }

  private removeMoveOptions(): void {
    this.chessBoardFields.forEach((field) => (field.isOption = false));
    this.updateFields();
  }

  private squareToRank(square: Square) {
    return square >> 3; // div 8
  }

  private squareToFile(square: Square) {
    return square & 7; // modulo 8
  }

  private positionToSquare(position: Position): Square {
    return 8 * position.rank + position.file;
  }

  selectPiece(pieceObject: Object3D): void {
    console.log("Selecting piece");

    const square: Square = 8 * pieceObject.position.z + pieceObject.position.x;
    const piece = this.chessBoardFields.get(square)?.placedPiece;
    if (piece) {
      piece.select();
      this.selectedPiece = piece;
      this.highlightMoveOptions(square);
    } else {
      throw new Error("Piece not found on this field.");
    }
    console.log("Piece selected");
  }

  unSelectPiece(): void {
    this.selectedPiece?.unSelect();
    this.selectedPiece = undefined;
  }

  getSelectedPiece(): Object3D | undefined {
    if (this.selectedPiece) {
      console.log(
        "returning selected piece of " + this.selectedPiece.getPosition()
      );
      return this.selectedPiece?.object3D;
    } else {
      console.log("nothing selected");
      return undefined;
    }
  }

  rotateY(angle = 10): void {
    this.chessBoardObject3D.rotateY(angle);
  }

  grow(): void {
    this.chessBoardObject3D.scale.x *= 1.1;
    this.chessBoardObject3D.scale.y *= 1.1;
    this.chessBoardObject3D.scale.z *= 1.1;
  }

  shrink(): void {
    this.chessBoardObject3D.scale.x *= 0.9;
    this.chessBoardObject3D.scale.y *= 0.9;
    this.chessBoardObject3D.scale.z *= 0.9;
  }

  place(matrix4: Matrix4): void {
    this.chessBoardObject3D.position.setFromMatrixPosition(matrix4);
    this.chessBoardObject3D.visible = true;
  }

  moveSelectedPieceTo(position: Position): void {
    if (this.selectedPiece) {
      const oldPosition = this.positionToSquare(
        this.selectedPiece.getPosition()
      );
      const newPosition = this.positionToSquare(position);

      if (oldPosition) {
        this.chessOps.play({ from: oldPosition, to: newPosition });
        this.selectedPiece.setPosition({
          file: position.file,
          rank: position.rank,
        });
      } else {
        throw Error("old position for move not found");
      }

      this.selectedPiece.unSelect();
      this.removeMoveOptions();
      this.readBoardAndPositionPieces();
    } else {
      throw new Error("No piece selected. Cannot move..");
    }
  }

  private readBoardAndPositionPieces() {
    this.pieceMap.reset();
    this.chessBoardFields.forEach((field, key) => {
      const coPiece = this.chessOps.board.get(key);
      if (coPiece?.role && coPiece.color) {
        const arPiece = this.pieceMap.setUnpositioned(
          coPiece?.role,
          coPiece?.color,
          {
            file: this.squareToFile(key),
            rank: this.squareToRank(key),
          }
        );
        field.placedPiece = arPiece;
      }
    });
  }

  private fieldGeometry = new BoxGeometry(1, 0.01, 1);
  private fieldDarkMaterial = new MeshStandardMaterial({
    color: 0xf5f5dc,
    opacity: 0.7,
  });
  private fieldLightMaterial = new MeshStandardMaterial({
    color: 0x463f31,
    opacity: 0.7,
  });
  private fieldOptionMaterial = new MeshStandardMaterial({
    color: 0xcb42f5,
    opacity: 0.7,
  });

  private generateFields() {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const square: Square = 8 * y + x;
        let material;
        if ((x + y) % 2 === 1) {
          material = this.fieldDarkMaterial;
        } else {
          material = this.fieldLightMaterial;
        }
        const cube = new Mesh(this.fieldGeometry, material);
        this.chessBoardObject3D.add(cube);
        cube.position.set(x, 0, y);
        this.chessBoardFields.set(square, {
          object3D: cube,
          placedPiece: null,
        });
      }
    }
  }

  private updateFields() {
    console.log("updading all fields");
    this.chessBoardFields.forEach((field, key) => {
      let material;
      if (field.isOption) {
        console.log(field);
        material = this.fieldOptionMaterial;
      } else if ((this.squareToFile(key) + this.squareToRank(key)) % 2 === 1) {
        material = this.fieldDarkMaterial;
      } else {
        material = this.fieldLightMaterial;
      }
      (<Mesh>field.object3D).material = material;
    });
  }
}
