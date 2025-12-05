import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeliveryPixel {
  id: string;
  product_id: string;
  platform: string;
  pixel_id: string;
  access_token: string | null;
  event_name: string;
  is_active: boolean;
}

interface PixelConfigProps {
  productId: string;
}

const PLATFORMS = [
  { value: "meta", label: "Meta/Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google Ads" },
  { value: "pinterest", label: "Pinterest" },
  { value: "taboola", label: "Taboola" },
];

const DEFAULT_EVENTS: Record<string, string> = {
  meta: "Purchase",
  tiktok: "CompletePayment",
  google: "conversion",
  pinterest: "checkout",
  taboola: "purchase",
};

const PixelConfig = ({ productId }: PixelConfigProps) => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newPixel, setNewPixel] = useState({
    platform: "meta",
    pixel_id: "",
    access_token: "",
    event_name: "Purchase",
  });

  const { data: pixels, isLoading } = useQuery({
    queryKey: ["delivery-pixels", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_pixels")
        .select("*")
        .eq("product_id", productId)
        .order("created_at");

      if (error) throw error;
      return data as DeliveryPixel[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("delivery_pixels").insert({
        product_id: productId,
        platform: newPixel.platform,
        pixel_id: newPixel.pixel_id,
        access_token: newPixel.access_token || null,
        event_name: newPixel.event_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-pixels", productId] });
      toast.success("Pixel adicionado!");
      setShowAdd(false);
      setNewPixel({
        platform: "meta",
        pixel_id: "",
        access_token: "",
        event_name: "Purchase",
      });
    },
    onError: () => {
      toast.error("Erro ao adicionar pixel");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("delivery_pixels")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-pixels", productId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_pixels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-pixels", productId] });
      toast.success("Pixel removido!");
    },
  });

  const handlePlatformChange = (platform: string) => {
    setNewPixel((prev) => ({
      ...prev,
      platform,
      event_name: DEFAULT_EVENTS[platform] || "Purchase",
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pixels?.map((pixel) => (
        <Card key={pixel.id}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {PLATFORMS.find((p) => p.value === pixel.platform)?.label || pixel.platform}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={pixel.is_active}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: pixel.id, is_active: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(pixel.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">ID:</span> {pixel.pixel_id}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Evento:</span> {pixel.event_name}
            </p>
            {pixel.access_token && (
              <p className="text-sm">
                <span className="text-muted-foreground">Token:</span> ****
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Adicionar Pixel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={newPixel.platform}
                onValueChange={handlePlatformChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ID do Pixel *</Label>
              <Input
                value={newPixel.pixel_id}
                onChange={(e) =>
                  setNewPixel((prev) => ({ ...prev, pixel_id: e.target.value }))
                }
                placeholder={
                  newPixel.platform === "google"
                    ? "AW-123456789/AbCdEfGhI"
                    : "123456789"
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Access Token (opcional)</Label>
              <Input
                value={newPixel.access_token}
                onChange={(e) =>
                  setNewPixel((prev) => ({ ...prev, access_token: e.target.value }))
                }
                placeholder="Para Conversion API"
              />
              <p className="text-xs text-muted-foreground">
                Usado para enviar eventos server-side (mais confiável)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome do Evento</Label>
              <Input
                value={newPixel.event_name}
                onChange={(e) =>
                  setNewPixel((prev) => ({ ...prev, event_name: e.target.value }))
                }
                placeholder="Purchase"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAdd(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newPixel.pixel_id || addMutation.isPending}
                className="flex-1"
              >
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4" />
          Adicionar Pixel
        </Button>
      )}

      {pixels?.length === 0 && !showAdd && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhum pixel configurado. Os pixels serão disparados quando o lead acessar o link.
        </p>
      )}
    </div>
  );
};

export default PixelConfig;
