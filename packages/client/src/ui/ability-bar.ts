import type { Ability, CastRejection, DeepReadonly, EntityId, Simulation } from '@nen/sim';
import type * as Phaser from 'phaser';
import type { Translate } from '../i18n';
import { keyLabel, type KeyboardLayout } from '../input/key-labels';
import { DEPTH, THEME } from '../theme';
import { TEXT } from './text-keys';

const SLOT_SIZE = 56;
const SLOT_GAP = 18;
const BAR_WIDTH = SLOT_SIZE * 4 + SLOT_GAP * 3;
const BOTTOM_MARGIN = 34;
const MESSAGE_MS = 1200;

const FONT = 'ui-monospace, Consolas, monospace';

const REJECTION_TEXT: Readonly<Record<CastRejection, string>> = {
  cooldown: TEXT.castCooldown,
  nen: TEXT.castNen,
  exhausted: TEXT.castExhausted,
  locked: TEXT.castLocked,
  busy: TEXT.castBusy,
};

interface SlotView {
  readonly frame: Phaser.GameObjects.Rectangle;
  readonly shade: Phaser.GameObjects.Rectangle;
  readonly key: Phaser.GameObjects.Text;
  readonly cost: Phaser.GameObjects.Text;
  readonly name: Phaser.GameObjects.Text;
  readonly countdown: Phaser.GameObjects.Text;
}

export interface AbilityBarDeps {
  readonly sim: Simulation;
  readonly t: Translate;
  readonly championId: EntityId;
  /** Physical key codes of the four abilities, in slot order. */
  readonly keyCodes: readonly string[];
}

/**
 * Bottom-center HUD: health and nen gauges above the four ability slots, with
 * cooldowns, costs and why a cast was refused. Reads the state only.
 */
export class AbilityBar {
  private readonly scene: Phaser.Scene;
  private readonly deps: AbilityBarDeps;
  private readonly root: Phaser.GameObjects.Container;
  private readonly healthFill: Phaser.GameObjects.Rectangle;
  private readonly nenFill: Phaser.GameObjects.Rectangle;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly nenText: Phaser.GameObjects.Text;
  private readonly ruleText: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;
  private readonly slots: SlotView[] = [];
  private layout: KeyboardLayout | undefined;
  private messageUntil = 0;

  constructor(scene: Phaser.Scene, deps: AbilityBarDeps) {
    this.scene = scene;
    this.deps = deps;
    const { t } = deps;
    const left = -BAR_WIDTH / 2;

    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);
    const track = (y: number, height: number) =>
      scene.add.rectangle(left, y, BAR_WIDTH, height, THEME.barTrack).setOrigin(0, 0.5);
    this.healthFill = scene.add
      .rectangle(left, -SLOT_SIZE - 40, BAR_WIDTH, 12, THEME.health)
      .setOrigin(0, 0.5);
    this.nenFill = scene.add
      .rectangle(left, -SLOT_SIZE - 24, BAR_WIDTH, 10, THEME.nen)
      .setOrigin(0, 0.5);
    this.healthText = this.text(0, -SLOT_SIZE - 40, 11, THEME.hudTextStrong).setOrigin(0.5);
    this.nenText = this.text(0, -SLOT_SIZE - 24, 10, THEME.hudTextStrong).setOrigin(0.5);
    this.ruleText = this.text(left, -SLOT_SIZE - 58, 12, THEME.hudTextNen).setOrigin(0, 0.5);
    this.message = this.text(0, -SLOT_SIZE - 80, 15, THEME.hudWarning).setOrigin(0.5);
    this.message.setStroke('#000000', 4);
    this.root.add([
      track(-SLOT_SIZE - 40, 12),
      track(-SLOT_SIZE - 24, 10),
      this.healthFill,
      this.nenFill,
      this.healthText,
      this.nenText,
      this.ruleText,
      this.message,
    ]);

    for (let index = 0; index < 4; index++) this.slots.push(this.createSlot(index));

    const champion = this.champion();
    const definition = champion ? deps.sim.data.champions[champion.defId] : undefined;
    if (definition) {
      this.ruleText.setText(
        `${t(`specialization.${definition.specialization}.name`)} · ${t(definition.rule.name)}`,
      );
    }
  }

  setKeyboardLayout(layout: KeyboardLayout | undefined): void {
    this.layout = layout;
    this.slots.forEach((slot, index) =>
      slot.key.setText(keyLabel(this.deps.keyCodes[index] ?? '', layout)),
    );
  }

  place(width: number, height: number): void {
    this.root.setPosition(width / 2, height - BOTTOM_MARGIN);
  }

  showRejection(reason: CastRejection): void {
    this.message.setText(this.deps.t(REJECTION_TEXT[reason])).setAlpha(1);
    this.messageUntil = this.scene.time.now + MESSAGE_MS;
  }

  update(): void {
    const champion = this.champion();
    const { sim, t } = this.deps;
    if (!champion?.health || !champion.nen) return;

    const { health, nen } = champion;
    this.healthFill.setScale(clampRatio(health.current / health.max), 1);
    this.healthText.setText(`${Math.ceil(health.current)} / ${health.max}`);
    this.nenFill
      .setScale(clampRatio(nen.current / nen.max), 1)
      .setFillStyle(nen.exhausted ? THEME.nenExhausted : THEME.nen);
    const nenNumbers = `${Math.floor(nen.current)} / ${nen.max}`;
    this.nenText.setText(nen.exhausted ? `${t(TEXT.exhausted)} · ${nenNumbers}` : nenNumbers);

    champion.abilities?.forEach((slotState, index) => {
      const view = this.slots[index];
      const ability = sim.data.abilities[slotState.abilityId];
      if (!view || !ability) return;
      this.updateSlot(view, ability, slotState.cooldownTicks, nen.current, nen.exhausted);
    });

    const now = this.scene.time.now;
    if (this.messageUntil > 0 && now >= this.messageUntil) {
      this.message.setText('');
      this.messageUntil = 0;
    }
  }

  private updateSlot(
    view: SlotView,
    ability: DeepReadonly<Ability>,
    cooldownTicks: number,
    nen: number,
    exhausted: boolean,
  ): void {
    const { t, sim } = this.deps;
    const needed = ability.cost.kind === 'fixed' ? ability.cost.amount : ability.cost.minimum;
    const affordable = nen >= needed;

    view.name.setText(t(ability.name));
    view.cost.setText(ability.cost.kind === 'fixed' ? String(needed) : `${needed}+`);
    view.cost.setColor(affordable ? THEME.hudTextNen : THEME.hudWarning);
    view.frame.setStrokeStyle(2, affordable ? THEME.slotReady : THEME.slotNoNen);

    if (exhausted) {
      view.shade.setScale(1, 1).setAlpha(0.65);
    } else if (cooldownTicks > 0 && ability.cooldownTicks > 0) {
      view.shade.setScale(1, clampRatio(cooldownTicks / ability.cooldownTicks)).setAlpha(0.6);
    } else {
      view.shade.setScale(1, 0).setAlpha(0);
    }
    view.countdown.setText(
      cooldownTicks > 0 ? String(Math.ceil(cooldownTicks / sim.data.simulation.tickRate)) : '',
    );
  }

  private createSlot(index: number): SlotView {
    const x = -BAR_WIDTH / 2 + index * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
    const y = -SLOT_SIZE / 2;
    const background = this.scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, THEME.slotBackground);
    const frame = this.scene.add
      .rectangle(x, y, SLOT_SIZE, SLOT_SIZE)
      .setStrokeStyle(2, THEME.slotBorder);
    // Shrinks from the top as the cooldown runs out.
    const shade = this.scene.add
      .rectangle(x, y + SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, THEME.cooldownShade)
      .setOrigin(0.5, 1)
      .setAlpha(0);
    const key = this.text(x - SLOT_SIZE / 2 + 5, y - SLOT_SIZE / 2 + 3, 15, THEME.hudTextStrong);
    key.setFontStyle('bold').setText(keyLabel(this.deps.keyCodes[index] ?? '', this.layout));
    const cost = this.text(x + SLOT_SIZE / 2 - 4, y + SLOT_SIZE / 2 - 3, 11, THEME.hudTextNen);
    cost.setOrigin(1, 1);
    const countdown = this.text(x, y, 20, THEME.hudTextStrong).setOrigin(0.5).setFontStyle('bold');
    const name = this.text(x, 4, 10, THEME.hudText).setOrigin(0.5, 0);
    this.root.add([background, shade, frame, key, cost, countdown, name]);
    return { frame, shade, key, cost, name, countdown };
  }

  private text(x: number, y: number, size: number, color: string): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color });
  }

  private champion() {
    return this.deps.sim.state.entities.find((entity) => entity.id === this.deps.championId);
  }
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}
