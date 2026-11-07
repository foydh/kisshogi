export class InvalidPieceNameError extends Error {
    data;
    constructor(data) {
        super(`Invalid piece name: ${data}`);
        this.data = data;
        this.name = "InvalidPieceNameError";
    }
}
export class InvalidTurnError extends Error {
    data;
    constructor(data) {
        super(`Invalid turn: ${data}`);
        this.data = data;
        this.name = "InvalidTurnError";
    }
}
export class InvalidMoveError extends Error {
    data;
    constructor(data) {
        super(`Invalid move: ${data}`);
        this.data = data;
        this.name = "InvalidMoveError";
    }
}
export class InvalidMoveNumberError extends Error {
    data;
    constructor(data) {
        super(`Invalid move number: ${data}`);
        this.data = data;
        this.name = "InvalidMoveNumberError";
    }
}
export class InvalidDestinationError extends Error {
    data;
    constructor(data) {
        super(`Invalid destination: ${data}`);
        this.data = data;
        this.name = "InvalidDestinationError";
    }
}
export class PieceNotExistsError extends Error {
    data;
    constructor(data) {
        super(`Piece not exists: ${data}`);
        this.data = data;
        this.name = "PieceNotExistsError";
    }
}
export class InvalidLineError extends Error {
    data;
    constructor(data) {
        super(`Invalid line: ${data}`);
        this.data = data;
        this.name = "InvalidLineError";
    }
}
/**
 * @deprecated
 */
export class InvalidHandicapError extends Error {
    data;
    constructor(data) {
        super(`Invalid handicap: ${data}`);
        this.data = data;
        this.name = "InvalidHandicapError";
    }
}
export class InvalidBoardError extends Error {
    data;
    constructor(data) {
        super(`Invalid board: ${data}`);
        this.data = data;
        this.name = "InvalidBoardError";
    }
}
export class InvalidHandPieceError extends Error {
    data;
    constructor(data) {
        super(`Invalid hand piece: ${data}`);
        this.data = data;
        this.name = "InvalidHandPieceError";
    }
}
export class InvalidUSIError extends Error {
    data;
    constructor(data) {
        super(`Invalid USI: ${data}`);
        this.data = data;
        this.name = "InvalidUSIError";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Vycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLE9BQU8scUJBQXNCLFNBQVEsS0FBSztJQUMzQjtJQUFuQixZQUFtQixJQUFZO1FBQzdCLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxFQUFFLENBQUMsQ0FBQztRQURwQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsdUJBQXVCLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLEtBQUs7SUFDdEI7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEZCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsa0JBQWtCLENBQUM7SUFDakMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLEtBQUs7SUFDdEI7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEZCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsa0JBQWtCLENBQUM7SUFDakMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLEtBQUs7SUFDNUI7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEckIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUU3QixJQUFJLENBQUMsSUFBSSxHQUFHLHdCQUF3QixDQUFDO0lBQ3ZDLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxLQUFLO0lBQzdCO0lBQW5CLFlBQW1CLElBQVk7UUFDN0IsS0FBSyxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRHJCLFNBQUksR0FBSixJQUFJLENBQVE7UUFFN0IsSUFBSSxDQUFDLElBQUksR0FBRyx5QkFBeUIsQ0FBQztJQUN4QyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsS0FBSztJQUN6QjtJQUFuQixZQUFtQixJQUFZO1FBQzdCLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQztRQURsQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQXFCLENBQUM7SUFDcEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLEtBQUs7SUFDdEI7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEZCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsa0JBQWtCLENBQUM7SUFDakMsQ0FBQztDQUNGO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsS0FBSztJQUMxQjtJQUFuQixZQUFtQixJQUFZO1FBQzdCLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQztRQURsQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUM7SUFDckMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLEtBQUs7SUFDdkI7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEZixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsbUJBQW1CLENBQUM7SUFDbEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLEtBQUs7SUFDM0I7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsdUJBQXVCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEcEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUU3QixJQUFJLENBQUMsSUFBSSxHQUFHLHVCQUF1QixDQUFDO0lBQ3RDLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLEtBQUs7SUFDckI7SUFBbkIsWUFBbUIsSUFBWTtRQUM3QixLQUFLLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLENBQUM7UUFEYixTQUFJLEdBQUosSUFBSSxDQUFRO1FBRTdCLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDaEMsQ0FBQztDQUNGIn0=