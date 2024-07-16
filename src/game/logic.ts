import { produce } from "immer";
const addLog = (message: string, logs: GameState["log"]): GameState["log"] => {
  return [{ dt: new Date().getTime(), message: message }, ...logs].slice(
    0,
    MAX_LOG_SIZE
  );
};

export interface User {
  id: string;
}

export type Action = DefaultAction | GameAction;

export type ServerAction = WithUser<DefaultAction> | WithUser<GameAction>;

const MAX_LOG_SIZE = 4;

type WithUser<T> = T & { user: User; secret: string };

export type DefaultAction = { type: "USER_ENTERED" } | { type: "USER_EXIT" };

// This interface holds all the information about your game
export interface GameState {
  // currently the base64 string we are playing against
  captcha: string;
  captcha_type?: "image" | "audio";
  winner?: string;
  scoreboard: Record<string, number>;
  users: User[];
  log: {
    dt: number;
    message: string;
  }[];
}

export const initialGame = (captcha: string, winner?: string): GameState => ({
  captcha,
  winner,
  scoreboard: {},
  users: [],
  log: addLog("Game Created!", []),
});

export type GameAction =
  | {
      type: "GUESS";
      // todo what is the type of our captcha
      payload: { captcha: { value: string } };
    }
  | { type: "DECLARE_WINNER"; payload: { user: string } };

export const gameUpdater = (
  action: ServerAction,
  state: GameState
): GameState => {
  switch (action.type) {
    case "USER_ENTERED": {
      return {
        ...state,
        users: [...state.users, action.user],
        log: addLog(`user ${action.user.id} joined 🎉`, state.log),
      };
    }

    case "USER_EXIT": {
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.user.id),
        log: addLog(`user ${action.user.id} left 😢`, state.log),
      };
    }

    case "GUESS": {
      return state;
    }

    case "DECLARE_WINNER": {
      return produce(state, (draftState) => {
        draftState.winner = action.payload.user;
        draftState.scoreboard[action.payload.user] =
          (draftState.scoreboard[action.payload.user] ?? 0) + 1;
      });
    }
  }
};
