export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
  routePlan: any[];
}
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<JupiterQuote> {
  const response = await fetch(
    `https://api.jup.ag/swap/v1/quote?cluster=devnet&slippageBps=${slippageBps}` +
      `&swapMode=ExactIn&restrictIntermediateTokens=true&maxAccounts=64&instructionVersion=V1&` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${amount}`,
    {
      method: "GET",
      headers: {
        "x-api-key": process.env.NEXT_PUBLIC_JUPITER_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Jupiter quote");
  }

  return await response.json();
}

export async function getJupiterSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<string> {
  const response = await fetch(
    "https://api.jup.ag/swap/v1/swap?cluster=devnet",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_JUPITER_API_KEY!,
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            priorityLevel: "medium",
            maxLamports: 123,
          },
        },
      }),
    }
  );

  const { swapTransaction } = await response.json();
  return swapTransaction;
}
