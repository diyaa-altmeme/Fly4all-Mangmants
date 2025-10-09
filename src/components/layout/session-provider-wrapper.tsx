

// This component is no longer needed as we are using a custom AuthProvider.
// It can be deleted. For now, returning null to avoid build errors.
export default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
