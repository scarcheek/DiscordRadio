import net from 'net';

export type Message = {
  opcode: Opcode;
  payload: any;
};

export function connect(path: string): Promise<net.Socket>;
export function sendFrame(socket: net.Socket, payload: any);
export function receive(socket: net.Socket): Promise<Message>;
export function handshake(socket: net.Socket, payload: any): Promise<Message>;
export function sendAndReceiveFrame(socket: net.Socket, payload: any): Promise<Message>;
export function on(socket: net.Socket, event: 'receive', handler: (message: Message) => void);

export interface Client {
  sendFrame(payload: any);
  receive(): Promise<Message>;
  handshake(payload: any): Promise<Message>;
  sendAndReceiveFrame(payload: any): Promise<Message>;
  on(event: 'receive', handler: (message: Message) => void);
}

export default async function(path: string): Promise<Client>;
