import type { Abi, Hex, PublicClient, WalletClient } from "viem";
import { HECLIAR_GAME_ABI } from "@/lib/contracts/hecliar";

/**
 * Adapt a deployed HecliarGame to the shape ChainGameGateway expects.
 *
 * Two things this has to get right, both learned from the contract suite.
 *
 * Writes are confirmed. viem returns as soon as a transaction is submitted,
 * and every caller in this app reads state on the next line — the same race
 * that made the contract tests fail on a different test each run. Here it
 * would be worse: Base Sepolia has real block times, so an unconfirmed write
 * is almost guaranteed to be read stale.
 *
 * Writes that return a value are simulated first. createRobotMatch, createRoom
 * and joinRoom all return the match id, but a transaction receipt does not
 * carry a return value. simulateContract runs the call against current state
 * and gives back what it would return, and the request it produces is then
 * what gets sent, so the value and the transaction agree.
 */

const VALUE_RETURNING = new Set(["createRoom", "joinRoom", "createRobotMatch"]);

type WriteOptions = { account: `0x${string}`; value?: bigint };

export function createHecliarContract(
  address: `0x${string}`,
  publicClient: PublicClient,
  walletClient: WalletClient,
) {
  const read = new Proxy({} as Record<string, unknown>, {
    get(_target, property: string) {
      return async (args: readonly unknown[], options?: { account?: `0x${string}` }) =>
        publicClient.readContract({
          abi: HECLIAR_GAME_ABI as Abi,
          address,
          args: args as unknown[],
          functionName: property,
          // getMyRoundHandles is scoped to msg.sender, so the caller has to be
          // set or a player reads an empty hand.
          ...(options?.account ? { account: options.account } : {}),
        });
    },
  });

  const write = new Proxy({} as Record<string, unknown>, {
    get(_target, property: string) {
      return async (args: readonly unknown[], options: WriteOptions) => {
        const { request, result } = await publicClient.simulateContract({
          abi: HECLIAR_GAME_ABI as Abi,
          account: options.account,
          address,
          args: args as unknown[],
          functionName: property,
          ...(options.value === undefined ? {} : { value: options.value }),
        });

        const hash = await walletClient.writeContract(request as never);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error(`${property} reverted on chain (${hash})`);
        }

        return VALUE_RETURNING.has(property) ? (result as bigint) : undefined;
      };
    },
  });

  return { read, write, address } as never;
}

export type HecliarContract = ReturnType<typeof createHecliarContract>;

export const configuredAddress = (): `0x${string}` | null => {
  const address = process.env.NEXT_PUBLIC_HECLIAR_ADDRESS;
  return address && /^0x[0-9a-fA-F]{40}$/.test(address)
    ? (address as `0x${string}`)
    : null;
};

export type { Hex };
