// @ts-nocheck

import { GameItemKey } from "../../../typings/_.gameData";
import { gameData as GameData } from "../../../typings/gameData";
import { Item } from "../../../typings/item";
import { Prodigy } from "../../../typings/prodigy";
import { Game } from "../../../typings/game";

/** The hack variable. */
export const _ = window._;

/** The player variable */
export const player = _.player;

/** Gets the currently active Phaser state instance dynamically.
 *  The old pattern `window.Boot.prototype.game._state._current` was broken:
 *  Phaser sets `.game` on State *instances* (not the prototype), so prototype.game was null/undefined → crash.
 *  Use getCurrent() for any live state access. */
export const getCurrent = (): any => {
  try {
    return (window._ as any).instance?.game?.state?.getCurrentState() ?? null;
  } catch {
    return null;
  }
};

/** Proxy for backward compat — reads/writes delegate to the live current state.
 *  @deprecated Prefer getCurrent() for clarity. */
export const current: any = new Proxy({}, {
  get(_t, prop: string) {
    const s = getCurrent();
    return s ? s[prop] : undefined;
  },
  set(_t, prop: string, value: any) {
    const s = getCurrent();
    if (s) s[prop] = value;
    return true;
  }
});

const base: { game: Game, prodigy: Prodigy } = _.instance;

/** game */
export const game = base.game;

/** prodigy */
export const prodigy = base.prodigy;

/** gameData */
export const gameData: GameData = _.instance.game.state.states.get("Boot").gameData;

/** getItem */
export const getItem = <T extends GameItemKey>(type: T, id: number): Item<T> | null =>
	(_.gameData[type].find(x => x.ID === id) as null | Item<any>) ?? null;

/** 9000000000 */
export const VERY_LARGE_NUMBER = 9e9;

/** Attempts to force the charecter to save. */
export const saveCharacter = () => {
	_.network.processPlayer = true;
	_.player.forceSaveCharacter();
};

