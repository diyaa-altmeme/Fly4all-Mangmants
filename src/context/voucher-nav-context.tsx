

"use client";

import type { Client, Supplier, Box, User, AppSettings, Exchange } from '@/lib/types';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getUsers } from '@/app/users/actions';
import { getSettings } from '@/app/settings/actions';
import { useAuth } from '@/lib/auth-context';
import { getExchanges } from '@/app/exchanges/actions';

type VoucherNavDataContext = {
    clients: Client[];
    suppliers: Supplier[];
    boxes: Box[];
    users: User[];
    exchanges: Exchange[];
    settings: AppSettings;
};

type VoucherNavContextType = {
    data: VoucherNavDataContext | null;
    loaded: boolean;
    fetchData: (force?: boolean) => Promise<void>;
    refreshData: () => Promise<void>;
};

const VoucherNavContext = createContext<VoucherNavContextType>({
    data: null,
    loaded: false,
    fetchData: async () => {},
    refreshData: async () => {},
});

export const VoucherNavProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<VoucherNavDataContext | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const { user, loading: authLoading } = useAuth(); // Depend on auth context

    const fetchData = useCallback(async (force = false) => {
        if (isFetching || (loaded && !force)) return;

        setIsFetching(true);
        try {
            const [clientsResponse, suppliers, boxes, users, settings, exchangesRes] = await Promise.all([
                getClients({ all: true, includeInactive: false, relationType: 'client' }),
                getSuppliers({ all: true }),
                getBoxes(),
                getUsers({ all: true }),
                getSettings(),
                getExchanges(),
            ]);

            setData({
                clients: clientsResponse.clients || [],
                suppliers: suppliers || [],
                boxes,
                users: users as User[],
                exchanges: exchangesRes.accounts || [],
                settings,
            });
            setLoaded(true);
        } catch (error) {
            console.error("Failed to load initial voucher navigation data:", error);
            // Optionally set an error state here
        } finally {
            setIsFetching(false);
        }
    }, [isFetching, loaded]);
    
    // Fetch data only when user is available and not a client
    useEffect(() => {
        if (!authLoading && user && !('isClient' in user && user.isClient) && !loaded) {
            fetchData();
        }
    }, [user, authLoading, loaded, fetchData]);
    
    const refreshData = useCallback(async () => {
        await fetchData(true); // Force a refetch
    }, [fetchData]);


    return (
        <VoucherNavContext.Provider value={{ data, loaded, fetchData, refreshData }}>
            {children}
        </VoucherNavContext.Provider>
    );
};

export const useVoucherNav = () => {
    const context = useContext(VoucherNavContext);
    if (context === undefined) {
        throw new Error('useVoucherNav must be used within a VoucherNavProvider');
    }
    return context;
};
