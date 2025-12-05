import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsAdmin(data?.role === "admin");
      }
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar - Sticky */}
      <div className="hidden md:block flex-shrink-0">
        <AppSidebar isAdmin={isAdmin} userId={userId} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-lg border-b border-border/50 flex items-center px-4 z-50 shadow-lg">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-secondary">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px] border-r border-border/50">
            <AppSidebar isAdmin={isAdmin} userId={userId} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-3 ml-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            <img src="/logo-ov.png" alt="Origem Viva" className="h-8 w-8 relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Origem Viva</span>
            <span className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase">
              Marketing Digital
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-x-hidden md:pt-0 pt-14">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
