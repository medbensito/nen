import type { Command, EntityId, KeyAction, Vec2 } from '@nen/sim';
import * as Phaser from 'phaser';
import type { KeyMap } from './key-bindings';

export interface PlayerInputHandlers {
  /** A command for the simulation. */
  readonly onCommand: (command: Command) => void;
  /** A move order was clicked (not repeated by holding): where to show feedback. */
  readonly onMoveClick: (target: Vec2) => void;
  /** An attack order was clicked: which enemy, for feedback. */
  readonly onAttackClick: (targetId: EntityId) => void;
  /** A non-simulation key action (camera), pressed or released. */
  readonly onKeyAction: (action: KeyAction, pressed: boolean) => void;
}

export interface PlayerInputOptions {
  readonly championId: EntityId;
  readonly keys: KeyMap;
  /** Milliseconds between move orders while the right button is held. */
  readonly moveRepeatMs: number;
  /** The enemy under a screen point, if any: right click on it means attack. */
  readonly pickEnemy: (screen: Readonly<Vec2>) => EntityId | null;
}

const ABILITY_SLOTS: Readonly<Record<string, number>> = {
  ability1: 0,
  ability2: 1,
  ability3: 2,
  ability4: 3,
};

/**
 * Turns mouse and keyboard into commands. Right click on an enemy: attack it;
 * elsewhere: move there. Holding the button repeats the order under the
 * cursor. Ability keys cast at once toward the cursor (quick cast). Keys are
 * matched by physical position.
 */
export class PlayerInput {
  private readonly scene: Phaser.Scene;
  private readonly options: PlayerInputOptions;
  private readonly handlers: PlayerInputHandlers;
  private moveHeld = false;
  private sinceLastMoveMs = 0;
  /**
   * Phaser dispatches each keyboard event as soon as it arrives, but only
   * empties its queue at the end of the frame: when two events land in the
   * same frame, the earlier one is dispatched again. Remembering handled
   * events makes every key press count once.
   */
  private readonly handledKeyEvents = new WeakSet<KeyboardEvent>();

  constructor(scene: Phaser.Scene, options: PlayerInputOptions, handlers: PlayerInputHandlers) {
    this.scene = scene;
    this.options = options;
    this.handlers = handlers;

    scene.input.mouse?.disableContextMenu();
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    scene.input.keyboard?.on('keydown', this.handleKeyDown, this);
    scene.input.keyboard?.on('keyup', this.handleKeyUp, this);
    // A button released outside the window never sends its "up" event.
    scene.game.events.on(Phaser.Core.Events.BLUR, this.releaseAll, this);
  }

  update(elapsedMs: number): void {
    if (!this.moveHeld) return;
    this.sinceLastMoveMs += elapsedMs;
    if (this.sinceLastMoveMs >= this.options.moveRepeatMs) {
      this.sinceLastMoveMs = 0;
      this.issueOrder();
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.rightButtonDown()) return;
    this.moveHeld = true;
    this.sinceLastMoveMs = 0;
    const order = this.issueOrder();
    if (order.type === 'attack') this.handlers.onAttackClick(order.targetId);
    else this.handlers.onMoveClick(order.target);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonReleased()) this.moveHeld = false;
  }

  private issueOrder(): { type: 'attack'; targetId: EntityId } | { type: 'move'; target: Vec2 } {
    const pointer = this.scene.input.activePointer;
    const entityId = this.options.championId;
    const targetId = this.options.pickEnemy({ x: pointer.x, y: pointer.y });
    if (targetId !== null) {
      this.handlers.onCommand({ type: 'attack', entityId, targetId });
      return { type: 'attack', targetId };
    }
    const target = this.cursorWorld();
    this.handlers.onCommand({ type: 'move', entityId, target });
    return { type: 'move', target };
  }

  private cursorWorld(): Vec2 {
    const pointer = this.scene.input.activePointer;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: world.x, y: world.y };
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.alreadyHandled(event)) return;
    const action = this.options.keys.get(event.code);
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;

    const slot = ABILITY_SLOTS[action];
    if (slot !== undefined) {
      this.handlers.onCommand({
        type: 'cast',
        entityId: this.options.championId,
        slot,
        target: this.cursorWorld(),
      });
    } else if (action === 'stop') {
      this.moveHeld = false;
      this.handlers.onCommand({ type: 'stop', entityId: this.options.championId });
    } else {
      this.handlers.onKeyAction(action, true);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (this.alreadyHandled(event)) return;
    const action = this.options.keys.get(event.code);
    if (action && action !== 'stop' && ABILITY_SLOTS[action] === undefined) {
      this.handlers.onKeyAction(action, false);
    }
  }

  private alreadyHandled(event: KeyboardEvent): boolean {
    if (this.handledKeyEvents.has(event)) return true;
    this.handledKeyEvents.add(event);
    return false;
  }

  private releaseAll(): void {
    this.moveHeld = false;
    for (const action of new Set(this.options.keys.values())) {
      if (action !== 'stop' && ABILITY_SLOTS[action] === undefined) {
        this.handlers.onKeyAction(action, false);
      }
    }
  }
}
