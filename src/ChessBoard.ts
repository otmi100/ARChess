import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import {
  Bishop,
  ChessPiece,
  King,
  Knight,
  Pawn,
  Queen,
  Rook,
} from "./ChessPieces";

type ChessBoardField = {
  field: Object3D;
  placedPiece: ChessPiece | null;
};

export type Position = {
  x: number;
  y: number;
};

export class ChessBoard {
  private chessBoardFields: ChessBoardField[][] = [];
  private chessBoardObject: Group = new Group();
  private pieces: ChessPiece[] = [];
  private loadedPieceObjects: Object3D[] = [];
  private selectedPiece: ChessPiece | undefined;

  constructor() {
    this.generateFields();
    this.loadAndPositionAllPieces();

    this.chessBoardObject.scale.set(0.1, 0.1, 0.1);
  }

  getAllVisiblePieceObjects(): Object3D[] {
    let visiblePieces: Object3D[] = [];
    //console.log("looking for pieces");
    for (let i = 0; i < this.loadedPieceObjects.length; i++) {
      if (this.loadedPieceObjects[i].visible === true) {
        //console.log("piece is visible and should be returned");
        visiblePieces.push(this.loadedPieceObjects[i]);
      } else {
        //console.log("piece has no position and should not be returned");
      }
    }
    //console.log(visiblePieces);
    return visiblePieces;
  }

  getAllFieldObjects(): Object3D[] {
    let fieldObjects: Object3D[] = [];
    this.chessBoardFields.forEach((fieldRows) => {
      fieldRows.forEach((field) => {
        fieldObjects.push(field.field);
      });
    });
    return fieldObjects;
  }

  getBoardObject(): Group {
    return this.chessBoardObject;
  }
  getFieldPosition(position: Position): Vector3 {
    return this.chessBoardFields[position.x][position.y].field.position;
  }

  placePieceOnField(piece: ChessPiece, position: Position) {
    if (this.chessBoardFields[position.x][position.y].placedPiece != null) {
      console.log("Da steht schon einer..");
      this.chessBoardFields[position.x][position.y].placedPiece?.setPosition(
        null
      );
    }
    this.chessBoardFields[position.x][position.y].placedPiece = piece;
    piece.setPosition(position);
  }

  selectPiece(pieceObject: Object3D) {
    console.log("Selecting piece");
    let piece = this.chessBoardFields[pieceObject.position.x][
      pieceObject.position.z
    ].placedPiece;
    if (piece) {
      this.selectedPiece?.unSelect();
      piece.select();
      this.selectedPiece = piece;
    } else {
      throw new Error("Piece not found on this field.");
    }
    console.log("Piece selected");
  }

  unSelectPiece() {
    this.selectedPiece?.unSelect();
    this.selectedPiece = undefined;
  }

  getSelectedPiece(): Object3D | undefined {
    if(this.selectedPiece) {
      console.log("returning selected piece of " + this.selectedPiece.getPosition());
      return this.selectedPiece?.object3D;
    } else {
      console.log("nothing selected");
      return undefined;
    }
  }

  moveSelectedPiece(position: Position) {
    if (this.selectedPiece) {
      this.selectedPiece.setPosition(position);
      this.selectedPiece.unSelect();
    } else {
      throw new Error("No piece selected. Cannot move..");
    }
  }

  private loadAndPositionAllPieces() {
    this.pieces = this.getAllStartingPieces();
    this.pieces.forEach((piece: ChessPiece) => {
      piece.getObject3D().then((object) => {
        //console.log(object);
        let position = piece.getPosition();
        if (position) {
          object.position.copy(this.getFieldPosition(position));
          let field = this.chessBoardFields[position.x][position.y].placedPiece = piece;
        }
        object.scale.set(0.25, 0.25, 0.25);
        this.chessBoardObject.add(object);
        this.loadedPieceObjects.push(object);
      });
    });
  }

  private generateFields() {
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
        this.chessBoardObject.add(cube);
        boardRow.push({ field: cube, placedPiece: null });
        cube.position.set(x, 0, y);
      }
      this.chessBoardFields.push(boardRow);
    }
  }

  private getAllStartingPieces(): ChessPiece[] {
    let pieceTypes = [Bishop, King, Knight, Pawn, Queen, Rook];
    let pieces: ChessPiece[] = [];

    pieceTypes.forEach((type) => {
      type.startingPositions.forEach((startingPosition) => {
        startingPosition.position.forEach((position) => {
          pieces.push(new type(startingPosition.color, position));
        });
      });
    });
    return pieces;
  }
}
