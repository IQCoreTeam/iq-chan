import { test, expect, mock } from 'bun:test';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';
import { Keypair, type PublicKey } from '@solana/web3.js';
import {
  BaseMessageSignerWalletAdapter,
  WalletReadyState,
  WalletConnectionError,
  type WalletName,
} from '@solana/wallet-adapter-base';
// @ts-expect-error Test the installed adapter lifecycle directly; its internal JS entry has no declaration.
import { WalletProviderBase } from '../node_modules/@solana/wallet-adapter-react/lib/esm/WalletProviderBase.js';
import Modal from '../src/lib/chains/solana/wallet-modal-ui';

class Adapter extends BaseMessageSignerWalletAdapter {
  name = 'QA Wallet' as WalletName;
  url = 'https://example.com';
  icon = '';
  readyState = WalletReadyState.Installed;
  publicKey: PublicKey | null = null;
  connecting = false;
  supportedTransactionVersions = new Set<'legacy'>(['legacy']);
  calls = 0;
  release: () => void = () => {};
  fail = false;
  locked = false;
  async connect() {
    this.calls++;
    this.connecting = true;
    if (this.locked)
      await new Promise<void>((resolve) => {
        this.release = resolve;
      });
    try {
      if (this.fail) {
        const e = new WalletConnectionError('User rejected the request');
        this.emit('error', e);
        throw e;
      }
      this.publicKey = Keypair.generate().publicKey;
      this.emit('connect', this.publicKey);
    } finally {
      this.connecting = false;
    }
  }
  async disconnect() {
    this.publicKey = null;
    this.emit('disconnect');
  }
  async signTransaction<
    T extends
      | import('@solana/web3.js').Transaction
      | import('@solana/web3.js').VersionedTransaction,
  >(tx: T): Promise<T> {
    return tx;
  }
  async signMessage(message: Uint8Array) {
    return message;
  }
}
let show = true;
mock.module('../src/lib/wallet-modal', () => ({
  useWalletModal: () => ({
    open: show,
    closeWalletModal: () => {
      show = false;
    },
  }),
}));
const { createRoot } = await import('react-dom/client');
async function setup(adapter: Adapter) {
  show = true;
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  function Harness() {
    const [selected, setSelected] = useState<Adapter | null>(null);
    return (
      <WalletProviderBase
        wallets={[adapter]}
        adapter={selected}
        isUnloadingRef={{ current: false }}
        onAutoConnectRequest={selected ? () => selected.connect() : undefined}
        onConnectError={() => setSelected(null)}
        onSelectWallet={() => setSelected(adapter)}
        onError={() => {}}
      >
        <Modal />
      </WalletProviderBase>
    );
  }
  const root = createRoot(document.getElementById('root')!);
  await act(async () => root.render(<Harness />));
  return {
    click: async () => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent === 'QA Wallet',
      )!;
      await act(async () => b.click());
    },
    close: async () => {
      await act(async () => root.unmount());
      dom.window.close();
    },
  };
}
test('immediate adapter response is observed after React selection listeners mount', async () => {
  const a = new Adapter();
  const v = await setup(a);
  try {
    await v.click();
    expect(a.calls).toBe(1);
    expect(show).toBe(false);
    expect(a.connected).toBe(true);
  } finally {
    await v.close();
  }
});
test('locked wallet stays visibly pending and unlock completes without reload or a duplicate prompt', async () => {
  const a = new Adapter();
  a.locked = true;
  const v = await setup(a);
  try {
    await v.click();
    expect(document.querySelector('[role=status]')?.textContent).toContain(
      'unlock',
    );
    expect(a.calls).toBe(1);
    await v.click();
    expect(a.calls).toBe(1);
    await act(async () => a.release());
    expect(show).toBe(false);
    expect(a.connected).toBe(true);
  } finally {
    await v.close();
  }
});
test('rejected connection shows an error and succeeds on an explicit retry without reload', async () => {
  const a = new Adapter();
  a.fail = true;
  const v = await setup(a);
  try {
    await v.click();
    expect(document.querySelector('[role=alert]')?.textContent).toContain(
      'User rejected',
    );
    expect(show).toBe(true);
    a.fail = false;
    await v.click();
    expect(show).toBe(false);
    expect(a.calls).toBe(2);
  } finally {
    await v.close();
  }
});
