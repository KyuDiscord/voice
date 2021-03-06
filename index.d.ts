import type { Client, Extender, Guild, Store, VoiceChannel } from "@kyudiscord/neo";
import type { EventEmitter } from "events";
import type { Event, LoadTracksResponse, NodeStats, PlayerUpdate, Track, TrackInfo } from "@lavaclient/types";

declare module "@kyudiscord/neo" {
  interface Client {
    readonly voice: PlayerManager;
  }

  interface VoiceChannel {
    /**
     * The player for this voice channel.
     */
    player: Player | null;

    /**
     * Joins this voice channel.
     * @param options Options for self mute and self deaf.
     * @since  @kyudiscord/voice 1.0.3
     */
    join(options?: JoinOptions): Player;

    /**
     * Leaves this voice channel.
     * @since @kyudiscord/voice 1.0.3
     */
    leave(): Promise<this>;
  }

  interface Guild {
    /**
     * The voice channel link for this guild.
     * @since @kyudiscord/voice 1.0.3
     */
    link: Link | null;
  }
}

export class PlayerManager extends EventEmitter {
  /**
   * The client instance.
   */
  readonly client: Client;
  /**
   * All connected lavalink nodes.
   */
  readonly nodes: Store<string, LavalinkNode>;
  /**
   * Options for lavalink resuming.
   */
  resuming: ResumeOptions | null;
  /**
   * Options to use when reconnecting.
   */
  reconnection: ReconnectOptions;

  /**
   * @param client
   * @param options
   */
  constructor(client: Client, options?: ManagerOptions);

  /**
   * Ideal nodes to use.
   */
  get idealNodes(): LavalinkNode[];

  /**
   * All connected players.
   */
  get players(): Store<string, Player>;

  /**
   * Creates a new player.
   * @param guild The guild that the player is for.
   * @param node The node to use.
   */
  create(guild: string | Guild, node?: string | LavalinkNode): Player | undefined;

  /**
   * Creates a new player.
   * @param guild The guild that the player is for.
   */
  destroy(guild: string | Guild): Promise<void>;
}

export interface ManagerOptions {
  nodes?: NodeData[];
  resuming?: ResumeOptions | boolean;
  reconnect?: ReconnectOptions;
}

export interface ReconnectOptions {
  maxTries?: number;
  auto?: boolean;
  delay?: number;
}

export interface ResumeOptions {
  timeout?: number;
  key?: string;
}

export interface VoiceStateUpdate {
  guild_id: string;
  channel_id?: string;
  user_id: string;
  session_id: string;
  deaf?: boolean;
  mute?: boolean;
  self_deaf?: boolean;
  self_mute?: boolean;
  suppress?: boolean;
}

export interface VoiceServerUpdate {
  guild_id: string;
  token: string;
  endpoint: string;
}

export enum Status {
  CONNECTED = 0,
  CONNECTING = 1,
  IDLE = 2,
  DISCONNECTED = 3,
  RECONNECTING = 4
}

export class LavalinkNode {
  /**
   * The link manager instance.
   */
  readonly manager: PlayerManager;
  /**
   * The player collection.
   */
  readonly players: Store<string, Player>;
  /**
   * The rest manager for this node.
   */
  readonly rest: REST;
  /**
   * This lavalink nodes identifier.
   */
  readonly id: string;
  /**
   * Number of remaining reconnect tries.
   */
  remainingTries: number;
  /**
   * The status of this lavalink node.
   */
  status: Status;
  /**
   * Hostname of the lavalink node.
   */
  host: string;
  /**
   * Port of the lavalink node.
   */
  port?: number;
  /**
   * Password of the lavalink node.
   */
  password: string;
  /**
   * The performance stats of this player.
   */
  stats: NodeStats;
  /**
   * The resume key.
   */
  resumeKey?: string;
  /**
   * Whether or not this lavalink node uses https.
   */
  https: boolean;

  /**
   * @param manager
   * @param data
   */
  constructor(manager: PlayerManager, data: NodeData);

  /**
   *
   */
  get reconnection(): ReconnectOptions;

  /**
   * If this node is connected or not.
   */
  get connected(): boolean;

  /**
   * The address of this lavalink node.
   */
  get address(): string;

  /**
   * Get the total penalty count for this node.
   */
  get penalties(): number;

  /**
   * Send a message to lavalink.
   * @param data The message data.
   * @param priority If this message should be prioritized.
   * @since 1.0.0
   */
  send(data: unknown, priority?: boolean): Promise<void>;

  /**
   * Connects to the lavalink node.
   * @since 1.0.0
   */
  connect(): void;

  /**
   * Creates a new guild link.
   * @param guild The guild to create a link for.
   */
  createPlayer(guild: string | Guild): Player;

  /**
   * Destroys a player.
   * @param guild The guild of the player to destroy.
   */
  destroyPlayer(guild: string | Guild): Promise<void>;

  /**
   * Reconnect to the lavalink node.
   */
  reconnect(): void;
}

export interface NodeData {
  id: string;
  host: string;
  https?: boolean;
  port?: number;
  password?: string;
}

export interface Payload {
  resolve: (...args: unknown[]) => unknown;
  reject: (...args: unknown[]) => unknown;
  data: unknown;
}

export class Player extends EventEmitter {
  /**
   * The guild link of this player.
   */
  readonly link: Link;
  /**
   * The current playing track.
   */
  track: AudioTrack | null;
  /**
   * Whether or not this player is paused.
   */
  paused: boolean;
  /**
   * Whether or not this player is playing.
   */
  playing: boolean;
  /**
   * The volume of this player.
   */
  volume: number;
  /**
   * The current equalizer config for this player.
   */
  equalizer: Band[];

  /**
   * @param link
   */
  constructor(link: Link);

  /**
   * The lavalink node that manages this player.
   */
  get node(): LavalinkNode;

  /**
   * The player manager instance.
   */
  get manager(): PlayerManager;

  /**
   * Play a track.
   * @param track The track to play.
   * @param options Options to pass to lavalink.
   * @since 1.0.0
   */
  play(track: string | Track, options?: PlayOptions): Promise<Player>;

  /**
   * Set the paused state of this player: true for paused; false for not paused;
   * @param state
   * @since 1.0.0
   */
  pause(state?: boolean): Promise<Player>;

  /**
   * Sets the pause state of this player to `false`.
   * @since 1.0.0
   */
  resume(): Promise<Player>;

  /**
   * Stops the current playing track.
   * @since 1.0.0
   */
  stop(): Promise<Player>;

  /**
   * Set the volume of this player.
   * @param value Number between 0 and 1000, defaults to `100`.
   */
  setVolume(value?: number): Promise<Player>;

  /**
   * Seek to a position in the current playing track.
   * @param pos Position in milliseconds.
   */
  seek(pos: number): Promise<Player>;

  /**
   * Set the equalizer of the player.
   * @param bands The bands of the equalizer.
   * @param merge Whether to merge the existing equalizer bands with the provided.
   * @since 1.0.0
   */
  setEqualizer(bands: Array<number | Band>, merge?: boolean): Promise<this>;

  /**
   * Destroys this player.
   * @since 1.0.0
   */
  destroy(): Promise<Player>;
}

export interface Band {
  band: number;
  gain: number;
}

export interface PlayOptions {
  startTime?: number;
  endTime?: number;
  noReplace?: boolean;
}

export class Link {
  /**
   * The guild this link is for.
   */
  readonly guildId: string;
  /**
   * The guild player.
   */
  readonly player: Player;
  /**
   * The lavalink node that this link uses.
   */
  node: LavalinkNode;
  /**
   * The voice channel that this link is for.
   */
  channelId?: string;

  /**
   * @param node
   * @param guildId
   */
  constructor(node: LavalinkNode, guildId: string);

  /**
   * The neo client.
   */
  get client(): Client;

  /**
   * The guild this link is for.
   */
  get guild(): Guild;

  /**
   * Connects to a voice channel.
   * @param channel The channel to connect to.
   * @param deaf Whether to self deafen the client.
   * @param mute Whether to self mute the client.
   * @since 1.0.0
   */
  connect(channel: string | VoiceChannel | null, { deaf, mute }?: JoinOptions): Link;

  /**
   * Disconnects from the current voice channel if any.
   * @since 1.0.0
   */
  disconnect(): Link;

  /**
   * Moves to a different lavalink node.
   * @param node The lavalink node to move to.
   * @since 1.0.0
   */
  move(node: LavalinkNode): Promise<Link>;

  /**
   * Send a payload to the lavalink node.
   * @param op The code for this operation.
   * @param data The data for this operation.
   * @param priority If this operation should be prioritized.
   * @since 1.0.0
   */
  send(op: string, data?: Dictionary, priority?: boolean): Promise<Link>;

  /**
   * Provide a voice update from discord.
   * @param update
   * @since 1.0.0
   */
  provide(update: VoiceStateUpdate | VoiceServerUpdate): Link;

  /**
   /**
   * Send a voice update operation.
   * @since 1.0.0
   */
  voiceUpdate(): Promise<Link>;

  /**
   * @private
   */
  _handle(event: Event | PlayerUpdate): Promise<void>;
}

export interface JoinOptions {
  deaf?: boolean;
  mute?: boolean;
}

export class REST {
  /**
   * The lavalink node this rest manager belongs to.
   */
  readonly node: LavalinkNode;

  /**
   * @param node
   */
  constructor(node: LavalinkNode);

  /**
   * Load tracks from lavaplayer.
   * @param identifier The identifier.
   * @since 1.0.0
   */
  loadTracks(identifier: string): Promise<LoadTracksResponse>;

  /**
   * Decodes a single base64 track.
   * @param track The base64 track to decode.
   * @since 1.0.0
   */
  decodeTracks(track: string): Promise<TrackInfo>;
  /**
   * Decodes multiple base64 tracks.
   * @param tracks The base64 tracks to decode.
   * @since 1.0.0
   */
  decodeTracks(tracks: string[]): Promise<TrackInfo[]>;
}

export class AudioTrack implements Track {
  /**
   * The track string of this audio track.
   */
  readonly track: string;
  /**
   * The track info of this audio track.
   */
  readonly info: TrackInfo;
  /**
   * The current position of this track.
   */
  position: number;
  /**
   * The timestamp in which this track started playing.
   */
  timestamp: number;

  /**
   * @param track The lavaplayer track.
   */
  constructor(track: Track);

  /**
   * The amount of time this song has left (in milliseconds).
   * @since 1.0.0
   */
  get remaining(): number;

  /**
   * Defines the toString behavior of this audio track.
   * @since 1.0.0
   */
  toString(): string;
}

type VoiceExtender = Extender<never, {
  Player: typeof Player;
  Link: typeof Link;
  LavalinkNode: typeof LavalinkNode;
  AudioTrack: typeof AudioTrack;
}>

interface _default {
  PlayerManager: typeof PlayerManager;
  LavalinkNode: typeof LavalinkNode;
  Player: typeof Player;
  Link: typeof Link;
  REST: typeof REST;
  extender: VoiceExtender;
}

export const extender: VoiceExtender;
export default _default;
