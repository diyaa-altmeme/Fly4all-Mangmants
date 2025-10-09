

"use client";

import type { Client, Supplier, Box, User, AppSettings } from '@/lib/types';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { getClients } from '@/app/relations/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getUsers } from '@/app/users/actions';
import { getSettings } from '@/app/settings/actions';
import { useAuth } from '@/lib/auth-context';

type VoucherNavDataContext = {
    clients: Client[];
    suppliers: Supplier[];
    boxes: Box[];
    users: User[];
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
            const [allRelationsRes, boxes, users, settings] = await Promise.all([
                getClients({ all: true, includeInactive: false }),
                getBoxes(),
                getUsers(),
                getSettings(),
            ]);

            const allRelations = allRelationsRes.clients;

            const clients = allRelations.filter(r => r.relationType === 'client' || r.relationType === 'both');
            const suppliers = allRelations.filter(r => r.relationType === 'supplier' || r.relationType === 'both');

            setData({
                clients,
                suppliers,
                boxes,
                users,
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
        if (!authLoading && user && !('isClient' in user && user.isClient)) {
            fetchData();
        }
    }, [user, authLoading, fetchData]);
    
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
