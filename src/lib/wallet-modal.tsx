"use client";

import { createContext, useContext, useState, useCallback } from "react";

const WalletModalContext = createContext<{
    open: boolean;
    openWalletModal: () => void;
    closeWalletModal: () => void;
}>({ open: false, openWalletModal: () => {}, closeWalletModal: () => {} });

export function WalletModalProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const openWalletModal = useCallback(() => setOpen(true), []);
    const closeWalletModal = useCallback(() => setOpen(false), []);
    return (
        <WalletModalContext.Provider value={{ open, openWalletModal, closeWalletModal }}>
            {children}
        </WalletModalContext.Provider>
    );
}

export function useWalletModal() {
    return useContext(WalletModalContext);
}
