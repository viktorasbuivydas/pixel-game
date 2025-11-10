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
  private static playingSounds: Set<SoundID> = new Set(); // Track which sounds are currently playing

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
   * Prevents AudioBufferSourceNode buffer conflicts by tracking playing state.
   */
  static play(id: SoundID, overrides?: SoundOptions): void {
    if (this.muted) return;
    if (!this.loadedIds.has(id)) return;

    // If sound is already playing, don't try to play again to prevent buffer conflicts
    // This prevents the "Cannot set buffer to non-null after it has been already been set" error
    if (this.playingSounds.has(id)) {
      return;
    }

    // Stop any existing instance first to ensure clean state
    sound.stop(id);

    // Play using options if given
    const instance = sound.play(
      id,
      overrides
        ? {
            volume: overrides.volume,
            loop: overrides.loop,
          }
        : undefined
    );

    // Track that this sound is now playing
    if (instance) {
      this.playingSounds.add(id);

      // For non-looping sounds, remove from playing set when done
      // Handle both Promise and direct instance cases
      if (instance instanceof Promise) {
        instance
          .then((resolvedInstance) => {
            if (
              resolvedInstance &&
              typeof resolvedInstance === "object" &&
              "on" in resolvedInstance
            ) {
              (resolvedInstance as any).on("end", () => {
                this.playingSounds.delete(id);
              });
            } else {
              // If no event handler, remove after a timeout as fallback
              setTimeout(() => {
                this.playingSounds.delete(id);
              }, 1000);
            }
          })
          .catch(() => {
            this.playingSounds.delete(id);
          });
      } else if (instance && typeof instance === "object" && "on" in instance) {
        (instance as any).on("end", () => {
          this.playingSounds.delete(id);
        });
      } else {
        // Fallback: remove after a short delay if we can't track the end event
        setTimeout(() => {
          this.playingSounds.delete(id);
        }, 1000);
      }
    }
  }

  /**
   * Stop playback of a specific sound.
   */
  static stop(id: SoundID): void {
    if (!this.loadedIds.has(id)) return;
    sound.stop(id);
    this.playingSounds.delete(id);
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
    this.playingSounds.clear();
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
    // Stop and clean up before removing
    this.stop(id);
    sound.remove(id);
    this.loadedIds.delete(id);
    this.playingSounds.delete(id);
  }

  /**
   * Unload all sounds.
   */
  static unloadAll(): void {
    sound.stopAll();
    sound.removeAll();
    this.loadedIds.clear();
    this.playingSounds.clear();
  }
}

export { SoundManager };
