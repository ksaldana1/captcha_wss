import type * as Party from "partykit/server";

import {
  type Action,
  type GameState,
  type ServerAction,
  gameUpdater,
  initialGame,
} from "./game/logic";

export const PARTY_HOST = "https://test-pk.ksaldana1.partykit.dev";

const CAPTCHA_GENERATOR_HOST = "http://captcha-server.fly.dev";

export default class Server implements Party.Server {
  // @ts-ignore
  private gameState: GameState;
  // current Captcha secret as plain text value
  private secret: string = "";
  // base64 string to send to user
  // @ts-ignore
  private base64Captcha: string = "";

  constructor(readonly room: Party.Room) {
    this.gameState = initialGame("");
    this.create();
  }

  async create() {
    const response = await fetch(CAPTCHA_GENERATOR_HOST);
    const { base64, value } = (await response.json()) as {
      value: string;
      base64: string;
    };
    this.secret = value;
    this.base64Captcha = base64;

    this.gameState = initialGame(base64);
  }

  async newGame() {
    const response = await fetch(CAPTCHA_GENERATOR_HOST);
    const { base64, value } = (await response.json()) as {
      value: string;
      base64: string;
    };
    this.secret = value;
    this.base64Captcha = base64;

    this.gameState = {
      ...this.gameState,
      captcha: base64,
    };
  }

  async onConnect(connection: Party.Connection, _ctx: Party.ConnectionContext) {
    this.gameState = gameUpdater(
      {
        type: "USER_ENTERED",
        user: { id: connection.id },
        secret: this.secret,
      },
      this.gameState
    );
    this.room.broadcast(JSON.stringify(this.gameState));
  }

  async onClose(connection: Party.Connection) {
    this.gameState = gameUpdater(
      {
        type: "USER_EXIT",
        user: { id: connection.id },
        secret: this.secret,
      },
      this.gameState
    );
    this.room.broadcast(JSON.stringify(this.gameState));
  }

  onMessage(message: string, sender: Party.Connection) {
    const action: ServerAction = {
      ...(JSON.parse(message) as Action),
      user: { id: sender.id },
      secret: this.secret,
    };
    console.log(
      `Received action ${action.type} from user ${sender.id}: ${JSON.stringify(
        action
      )}`
    );

    if (action.type === "GUESS") {
      const isCorrect = action.payload.captcha.value === this.secret;
      if (isCorrect) {
        this.gameState = gameUpdater(
          {
            type: "DECLARE_WINNER",
            payload: { user: sender.id },
            user: { id: sender.id },
            secret: this.secret,
          },
          this.gameState
        );
        this.newGame();
      }
    } else {
      this.gameState = gameUpdater(action, this.gameState);
    }

    this.room.broadcast(JSON.stringify(this.gameState));
  }
}

Server satisfies Party.Worker;
