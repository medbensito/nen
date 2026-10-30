import type { CameraSettings, DeepReadonly, MapDef, Vec2 } from '@nen/sim';
import type * as Phaser from 'phaser';
import { CAMERA_BOUNDS_PADDING } from '../theme';
import { edgeScrollDelta, edgeScrollDirection, stepZoom } from './camera-math';

/** What the HUD needs to know about the camera. */
export interface CameraStatus {
  locked: boolean;
}

/**
 * Locked: the camera follows the champion. Free: it scrolls when the pointer
 * nears a screen edge, and recenters while the center key is held.
 */
export class CameraRig {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly settings: DeepReadonly<CameraSettings>;
  private readonly status: CameraStatus;
  private centering = false;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    settings: DeepReadonly<CameraSettings>,
    map: DeepReadonly<MapDef>,
    status: CameraStatus,
  ) {
    this.camera = camera;
    this.settings = settings;
    this.status = status;
    status.locked = settings.startLocked;
    camera.setZoom(settings.zoom.initial);
    camera.setBounds(
      -CAMERA_BOUNDS_PADDING,
      -CAMERA_BOUNDS_PADDING,
      map.width + CAMERA_BOUNDS_PADDING * 2,
      map.height + CAMERA_BOUNDS_PADDING * 2,
    );
  }

  get locked(): boolean {
    return this.status.locked;
  }

  toggleLock(): void {
    this.status.locked = !this.status.locked;
  }

  setCentering(held: boolean): void {
    this.centering = held;
  }

  zoomBy(wheelDeltaY: number): void {
    this.camera.setZoom(stepZoom(this.camera.zoom, wheelDeltaY, this.settings.zoom));
  }

  snapTo(focus: Readonly<Vec2>): void {
    this.camera.centerOn(focus.x, focus.y);
  }

  /** `pointer`: screen position of the pointer, or null when it is outside the game. */
  update(focus: Readonly<Vec2>, pointer: Readonly<Vec2> | null, elapsedSeconds: number): void {
    if (this.status.locked || this.centering) {
      this.camera.centerOn(focus.x, focus.y);
      return;
    }
    if (!pointer) return;

    const direction = edgeScrollDirection(pointer, this.camera, this.settings.edgeScrollMargin);
    if (direction.x === 0 && direction.y === 0) return;
    const delta = edgeScrollDelta(
      direction,
      this.settings.edgeScrollSpeed,
      elapsedSeconds,
      this.camera.zoom,
    );
    this.camera.scrollX += delta.x;
    this.camera.scrollY += delta.y;
  }
}
