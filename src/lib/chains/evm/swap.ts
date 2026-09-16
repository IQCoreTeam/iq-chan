// Uniswap V3 swap helpers for Robinhood Chain (chainId 4663).
// Buy = ETH -> token, Sell = token -> ETH, quotes via QuoterV2. Reads take a
// Provider; buy/sell take a Signer (from useEvmWallet().getSigner()).
//
// Addresses are the official Uniswap V3 deployment on Robinhood Chain
// (developers.uniswap.org). Factory verified on-chain against the live
// WETH/4663 pool. WETH is not in the docs table; taken from that pool's token0.
import {
    Contract,
    type Provider,
    type Signer,
    getAddress,
    parseEther,
    parseUnits,
    formatEther,
    formatUnits,
} from "ethers";

export const ROBINHOOD_DEX = {
    swapRouter02: getAddress("0xcaf681a66d020601342297493863e78c959e5cb2"),
    quoterV2: getAddress("0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7"),
    factory: getAddress("0x1f7d7550b1b028f7571e69a784071f0205fd2efa"),
    weth: getAddress("0x0bd7d308f8e1639fab988df18a8011f41eacad73"),
} as const;

// V3 fee tiers to probe, most-liquid-first for memecoin pairs.
const FEE_TIERS = [10000, 3000, 500, 100] as const;
// SwapRouter02 recipient sentinel: keep output in the router so we can unwrapWETH9.
const ADDRESS_THIS = "0x0000000000000000000000000000000000000002";
const DEFAULT_SLIPPAGE_BPS = 300; // 3%

const FACTORY_ABI = ["function getPool(address,address,uint24) view returns (address)"];
const QUOTER_ABI = [
    "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160,uint32,uint256)",
];
const ROUTER_ABI = [
    "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
    "function unwrapWETH9(uint256 amountMinimum,address recipient) payable",
    "function multicall(bytes[] data) payable returns (bytes[])",
];
const ERC20_ABI = [
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
];

export type TokenInfo = { address: string; symbol: string; decimals: number };

export async function getTokenInfo(provider: Provider, ca: string): Promise<TokenInfo> {
    const token = new Contract(getAddress(ca), ERC20_ABI, provider);
    const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);
    return { address: getAddress(ca), symbol, decimals: Number(decimals) };
}

export async function getTokenBalance(provider: Provider, ca: string, owner: string): Promise<{ raw: bigint; text: string; info: TokenInfo }> {
    const info = await getTokenInfo(provider, ca);
    const token = new Contract(info.address, ERC20_ABI, provider);
    const raw: bigint = await token.balanceOf(getAddress(owner));
    return { raw, text: formatUnits(raw, info.decimals), info };
}

/** First fee tier that has a WETH pool for this token, or null if none exists. */
export async function findFeeTier(provider: Provider, ca: string): Promise<number | null> {
    const factory = new Contract(ROBINHOOD_DEX.factory, FACTORY_ABI, provider);
    const token = getAddress(ca);
    for (const fee of FEE_TIERS) {
        const pool: string = await factory.getPool(ROBINHOOD_DEX.weth, token, fee);
        if (pool && pool !== "0x0000000000000000000000000000000000000000") return fee;
    }
    return null;
}

async function quote(provider: Provider, tokenIn: string, tokenOut: string, amountIn: bigint, fee: number): Promise<bigint> {
    const quoter = new Contract(ROBINHOOD_DEX.quoterV2, QUOTER_ABI, provider);
    // QuoterV2 is non-view (reverts to return data); staticCall reads it safely.
    const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: getAddress(tokenIn),
        tokenOut: getAddress(tokenOut),
        amountIn,
        fee,
        sqrtPriceLimitX96: 0,
    });
    return amountOut as bigint;
}

/** Quote a buy: ethIn (decimal ETH string) -> token amount (decimal string). */
export async function quoteBuy(provider: Provider, ca: string, ethIn: string, fee?: number) {
    const tier = fee ?? (await findFeeTier(provider, ca));
    if (tier == null) throw new Error("No Uniswap V3 pool for this token on Robinhood Chain");
    const info = await getTokenInfo(provider, ca);
    const out = await quote(provider, ROBINHOOD_DEX.weth, info.address, parseEther(ethIn), tier);
    return { fee: tier, amountOut: out, amountOutText: formatUnits(out, info.decimals), token: info };
}

/** Quote a sell: tokenIn (decimal token string) -> ETH amount (decimal string). */
export async function quoteSell(provider: Provider, ca: string, tokenIn: string, fee?: number) {
    const tier = fee ?? (await findFeeTier(provider, ca));
    if (tier == null) throw new Error("No Uniswap V3 pool for this token on Robinhood Chain");
    const info = await getTokenInfo(provider, ca);
    const out = await quote(provider, info.address, ROBINHOOD_DEX.weth, parseUnits(tokenIn, info.decimals), tier);
    return { fee: tier, amountOut: out, amountOutText: formatEther(out), token: info };
}

const minusSlippage = (amount: bigint, bps: number) => (amount * BigInt(10000 - bps)) / BigInt(10000);

/** Buy: swap `ethIn` ETH for the token, tokens sent to the signer. Returns the tx hash. */
export async function buyToken(signer: Signer, ca: string, ethIn: string, slippageBps = DEFAULT_SLIPPAGE_BPS): Promise<string> {
    const provider = signer.provider;
    if (!provider) throw new Error("signer has no provider");
    const me = await signer.getAddress();
    const q = await quoteBuy(provider, ca, ethIn);
    const router = new Contract(ROBINHOOD_DEX.swapRouter02, ROUTER_ABI, signer);
    const tx = await router.exactInputSingle(
        {
            tokenIn: ROBINHOOD_DEX.weth,
            tokenOut: q.token.address,
            fee: q.fee,
            recipient: me,
            amountIn: parseEther(ethIn),
            amountOutMinimum: minusSlippage(q.amountOut, slippageBps),
            sqrtPriceLimitX96: 0,
        },
        { value: parseEther(ethIn) },
    );
    return tx.hash;
}

/** Sell: swap `tokenIn` of the token for ETH. Approves the router if needed. Returns the tx hash. */
export async function sellToken(signer: Signer, ca: string, tokenIn: string, slippageBps = DEFAULT_SLIPPAGE_BPS): Promise<string> {
    const provider = signer.provider;
    if (!provider) throw new Error("signer has no provider");
    const me = await signer.getAddress();
    const info = await getTokenInfo(provider, ca);
    const amountIn = parseUnits(tokenIn, info.decimals);

    const token = new Contract(info.address, ERC20_ABI, signer);
    const allowance: bigint = await token.allowance(me, ROBINHOOD_DEX.swapRouter02);
    if (allowance < amountIn) {
        const approveTx = await token.approve(ROBINHOOD_DEX.swapRouter02, amountIn);
        await approveTx.wait();
    }

    const q = await quoteSell(provider, ca, tokenIn, undefined);
    const minOut = minusSlippage(q.amountOut, slippageBps);
    const router = new Contract(ROBINHOOD_DEX.swapRouter02, ROUTER_ABI, signer);
    // Swap token -> WETH into the router, then unwrap WETH -> ETH to the user, atomically.
    const swapData = router.interface.encodeFunctionData("exactInputSingle", [
        {
            tokenIn: info.address,
            tokenOut: ROBINHOOD_DEX.weth,
            fee: q.fee,
            recipient: ADDRESS_THIS,
            amountIn,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0,
        },
    ]);
    const unwrapData = router.interface.encodeFunctionData("unwrapWETH9", [minOut, me]);
    const tx = await router.multicall([swapData, unwrapData]);
    return tx.hash;
}
