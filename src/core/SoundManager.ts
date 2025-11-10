import { sound } from "@pixi/sound";
// SoundManager class implemented using @pixi/sound for audio management
type SoundID = string;

interface SoundOptions {
  volume?: number;
  loop?: boolean;
}

class SoundManager {
  private static loadedIds: Set<SoundID> = new Set();
  private static muted: boolean = false;

  /**
   * Loads a sound resource by providing a unique id and the source url(s).
   * Optionally provide sound options (like volume, loop).
   */
  static load(
    id: SoundID,
    src: string | string[],
    options?: SoundOptions
  ): void {
    // Only in browsers with window and sound
    if (typeof window === "undefined" || !sound) return;
    if (this.loadedIds.has(id)) return; // Prevent duplicate loads

    // sound.add(name, src or options)
    sound.add(id, {
      url: src,
      preload: true,
      volume: options?.volume ?? 1,
      loop: options?.loop ?? false,
    });
    this.loadedIds.add(id);
  }

  /**
   * Play a sound by its ID. Allows overrides for volume and looping.
   * If not loaded, does nothing.
   */
  static play(id: SoundID, overrides?: SoundOptions): void {
    if (this.muted) return;
    if (!this.loadedIds.has(id)) return;
    // Play using options if given
    sound.play(
      id,
      overrides
        ? {
            volume: overrides.volume,
            loop: overrides.loop,
          }
        : undefined
    );
  }

  /**
   * Stop playback of a specific sound.
   */
  static stop(id: SoundID): void {
    if (!this.loadedIds.has(id)) return;
    sound.stop(id);
  }

  /**
   * Pause all sounds.
   */
  static pauseAll(): void {
    sound.pauseAll();
  }

  /**
   * Stop all sounds.
   */
  static stopAll(): void {
    sound.stopAll();
  }

  /**
   * Mute all sounds.
   */
  static mute(): void {
    this.muted = true;
    sound.muteAll();
  }

  /**
   * Unmute all sounds.
   */
  static unmute(): void {
    this.muted = false;
    sound.unmuteAll();
  }

  /**
   * Checks if muting is enabled.
   */
  static isMuted(): boolean {
    return this.muted;
  }

  /**
   * Unload a specific sound from memory.
   */
  static unload(id: SoundID): void {
    if (!this.loadedIds.has(id)) return;
    sound.remove(id);
    this.loadedIds.delete(id);
  }

  /**
   * Unload all sounds.
   */
  static unloadAll(): void {
    sound.removeAll();
    this.loadedIds.clear();
  }
}

export { SoundManager };
