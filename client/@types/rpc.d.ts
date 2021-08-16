import { IpcClient } from '../src/infrastructure/ipc';



export type RpcConnection = {
  client: IpcClient,
  data: {
    v: number,
    config: {
      cdn_host: string,
      api_endpoint: string,
      environment: string,
    },
    user: {
      id: string,
      username: string,
      discriminator: string,
      avatar: string,
      bot: boolean,
      flags: number,
      premium_type: number,
    },
  },
};

export type TokenInfo = {
  access_token: string,
  expires_in: number,
  refresh_token: string,
  scope: string,
  token_type: string,
};

export type AuthInfo = {
  application: {
    id: string,
    name: string,
    icon: string,
    description: string,
    summary: string,
    cover_image: string,
    hook: true,
    verify_key: string,
  },
  scopes: string[],
  expires: string,
  user: {
    id: string,
    username: string,
    avatar: string,
    discriminator: string,
    public_flags: number
  },
  access_token: string,
};

export type Activity = {
  /** Do not set this lmao */
  name?: string,
  /** Do not set this lmao */
  type?: number,
  /** Do not set this lmao */
  created_at?: number,
  details?: string,
  state?: string,
  party?: {
    id?: string, 
    /** Index: 0 = current size, 1 = max size */
    size: number[],
  },
  timestamps: {
    start: number,
    end: number,
  },
  assets: {
    large_image: string,
    large_text: string,
    small_image: string,
    small_text: string,
  },
  secrets: {
    join: string,
    spectate: string,
    match: string,
  },
  /** Max size: 2 */
  buttons: ActivityButton[],
};

type ActivityButton = {
  label: string,
  url: string,
};



export interface RpcClient {
  /** The connection response sent by Discord */
  connectionResponse: any,

  /**
   * Asks the Discord user to authorize the client.
   * @param client_id The OAuth client ID of the application.
   * @param client_secret The OAuth client secret of the application.
   * @param scopes The OAuth scopes of the application.
   * @param redirect_uri The OAuth redirect URI of the application.
   * @return The Discord token info.
   */
  authorize(client_id: string, client_secret: string, scopes: string[], redirect_uri: string): Promise<TokenInfo>,

  /**
   * Authenticates the client to Discord IPC socket.
   * @param access_token The OAuth access token.
   * @return The Discord authentication info.
   */
  authenticate(access_token: string): Promise<AuthInfo>,

  /**
   * Authorizes and authenticates the client to Discord IPC socket.
   * @param client_id The OAuth client ID of the application.
   * @param client_secret The OAuth client secret of the application.
   * @param scopes The OAuth scopes of the application.
   * @param redirect_uri The OAuth redirect URI of the application.
   * @return The Discord authentication info.
   */
  login(client_id: string, client_secret: string, scopes: string[], redirect_uri: string): Promise<AuthInfo>,

  /**
   * Add an RPC event listener to the client.
   * @param event The event to listen for.
   * @param handler The handler to call when the event is emitted.
   */
  on(event: 'response', handler: (payload: any) => any),

  /**
   * Used to update a user's Rich Presence.
   * @param activity The activity to set.
   */
  setActivity(activity: Activity),
}
