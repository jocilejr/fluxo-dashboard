import { useIsMobile } from "@/hooks/useIsMobile";
import { AppLayout } from "./AppLayout";
import { MobileLayout } from "./mobile/MobileLayout";
import { MobileDashboard } from "./mobile/MobileDashboard";
import { MobileTransactions } from "./mobile/MobileTransactions";
import { MobileProfile } from "./mobile/MobileProfile";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  mobileComponent?: "dashboard" | "transactions" | "profile";
}

export function ResponsiveLayout({ children, mobileComponent }: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    let MobileContent: React.ReactNode;
    
    switch (mobileComponent) {
      case "dashboard":
        MobileContent = <MobileDashboard />;
        break;
      case "transactions":
        MobileContent = <MobileTransactions />;
        break;
      case "profile":
        MobileContent = <MobileProfile />;
        break;
      default:
        MobileContent = children;
    }

    return <MobileLayout>{MobileContent}</MobileLayout>;
  }

  return <AppLayout>{children}</AppLayout>;
}
