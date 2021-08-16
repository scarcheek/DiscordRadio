export type IpcMessage = {
  opcode: number,
  payload: any,
};



export interface IpcClient {
  /**
   * Send a handshake message to the IPC socket and wait for a response.
   * @param payload The payload to send.
   * @return A promise that resolves to the received handshake response.
   */
  handshake(payload: string | Buffer): Promise<IpcMessage>,

   /**
    * Send a frame to the IPC socket.
    * @param payload The payload to send.
    */
  sendFrame(payload: string | Buffer),
 
   /**
    * Send a frame to the IPC socket and wait for a response.
    * @return A promise that resolves to the received frame.
    */
  sendAndReceiveFrame(payload: string | Buffer): Promise<IpcMessage>,
 
   /**
    * Add an IPC event listener to the socket.
    * @param event The event to listen for.
    * @param handler The handler to call when the event is emitted.
    */
  on(event: 'receive', handler: (message: IpcMessage) => any),
}
