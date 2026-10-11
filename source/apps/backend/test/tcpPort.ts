import type { Server } from "http";

/*
 * server.address() is null before listen and a string for a pipe.
 * The HTTP tests listen on TCP. This reads that port without a cast.
 */
export function tcpPort(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The test server is not listening on a TCP port.");
  }
  return address.port;
}
