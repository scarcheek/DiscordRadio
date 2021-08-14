import * as ipc from "./infrastructure/ipc.js";

type Connection = {
  client: ipc.Client,
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

type TokenInfo = {
  access_token: string,
  expires_in: number,
  refresh_token: string,
  scope: string,
  token_type: string,
};

type AuthInfo = {
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

type Activity = {
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

export async function connect(client_id: string, version: number = 1): Promise<Connection>;
export async function authorize(
  client: ipc.Client, 
  client_id: string, 
  client_secret: string, 
  scopes: string[], 
  redirect_uri: string
): Promise<TokenInfo>;
export async function authenticate(client: ipc.Client, access_token: string): Promise<AuthInfo>;
export async function login(
  client: ipc.Client, 
  client_id: string, 
  client_secret: string, 
  scopes: string[], 
  redirect_uri: string
): Promise<AuthInfo>;
export function on(client: ipc.Client, event: 'response', handler: (any) => void);
export function setActivity(client: ipc.Client, activity: Activity);


interface Client {
  async authorize(
    client_id: string, 
    client_secret: string, 
    scopes: string[], 
    redirect_uri: string
  ): Promise<TokenInfo>;
  async authenticate(access_token: string): Promise<AuthInfo>;
  async login(
    client_id: string, 
    client_secret: string, 
    scopes: string[], 
    redirect_uri: string
  ): Promise<AuthInfo>;
  on(event: 'response', handler: (any) => void);
  setActivity(activity: Activity);
}

export default async function(client_id: string, version: number = 1): Promise<Client>;
