import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, History } from "lucide-react";
import ProductsTab from "@/components/entrega/ProductsTab";
import AccessesTab from "@/components/entrega/AccessesTab";

const Entrega = () => {
  const [activeTab, setActiveTab] = useState("produtos");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entrega Digital</h1>
        <p className="text-muted-foreground">
          Gerencie seus produtos digitais e links de entrega com tracking de pixels
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="produtos" className="gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="acessos" className="gap-2">
            <History className="h-4 w-4" />
            Acessos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-6">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="acessos" className="mt-6">
          <AccessesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Entrega;
